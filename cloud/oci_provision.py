# ============ KRAEFEGG ON CLOUD — VM Always Free OCI para opencode ============
# Provisiona na tenancy Kraefegg (Free Tier, sa-saopaulo-1):
#   VCN + Internet Gateway + Route Table + Security List (SSH 22) + Subnet pública
#   Instância Ampere A1.Flex (2 OCPU / 12 GB RAM — Always Free) com Ubuntu 24.04
#
# Pré-requisitos:
#   1) ~/.oci/oci_auth.env (usuário, token, tenancy/user OCID, região)
#   2) ~/.oci/api_key.pem  (chave de assinatura da API — gerada na sessão)
#   3) OCI_FINGERPRINT em oci_auth.env (fingerprint da api_key_public.pem, que
#      precisa ser adicionada em Console → Profile → API Keys)
#   4) ~/.ssh/kraefegg-vm.pub (chave SSH da instância)
#   5) python -m pip install oci
#
# Uso: python cloud/oci_provision.py

import os
import time
from datetime import datetime
from pathlib import Path

import oci

HOME = Path.home()
LOG_FILE = HOME / ".oci" / "oci_provision.log"


def _log(msg):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    try:
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def load_env():
    env = {}
    for line in (HOME / ".oci" / "oci_auth.env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


ENV = load_env()
COMPARTMENT = ENV["OCI_TENANCY"]                     # root compartment = tenancy OCID
REGION = ENV.get("OCI_REGION", "sa-saopaulo-1")
FINGERPRINT = ENV.get("OCI_FINGERPRINT", "")

CONFIG = {
    "user": ENV["OCI_USER_OCID"],
    "key_file": str(HOME / ".oci" / "api_key.pem"),
    "fingerprint": FINGERPRINT,
    "tenancy": COMPARTMENT,
    "region": REGION,
}

VCN_CIDR = "10.0.0.0/16"
SUBNET_CIDR = "10.0.0.0/24"
ADMIN_USER = "kraefegg"
VM_NAME = "kraefegg-opencode"
SIZES = [(2, 12), (1, 6), (4, 24)]  # (OCPU, GB RAM) A1.Flex — Always Free (2/12 = alvo do plano)
RETRIES = 3
RETRY_WAIT = 60


def get_ssh_key():
    pub = HOME / ".ssh" / "kraefegg-vm.pub"
    if not pub.exists():
        raise SystemExit("Falta ~/.ssh/kraefegg-vm.pub (chave SSH da instância)")
    return pub.read_text(encoding="utf-8").strip()


def get_public_ip(compute, net, compartment, instance_id):
    for a in compute.list_vnic_attachments(compartment_id=compartment, instance_id=instance_id).data:
        vnic = net.get_vnic(a.vnic_id).data
        if vnic.public_ip:
            return vnic.public_ip
    return None


def find_instance(compute, net, compartment):
    for inst in compute.list_instances(compartment_id=compartment).data:
        if inst.display_name != VM_NAME:
            continue
        if inst.lifecycle_state in ("PROVISIONING", "STARTING", "RUNNING"):
            ip = get_public_ip(compute, net, compartment, inst.id)
            _log(f"Instância já existe: {inst.id} | {inst.lifecycle_state} | IP: {ip}")
            return True
    return False


def find_ubuntu_image(compute, compartment):
    imgs = compute.list_images(
        compartment_id=compartment,
        operating_system="Canonical Ubuntu",
        operating_system_version="24.04",
        shape="VM.Standard.A1.Flex",
    ).data
    if not imgs:
        raise SystemExit("Nenhuma imagem Ubuntu 24.04 compatível com A1.Flex encontrada")
    imgs.sort(key=lambda i: i.time_created, reverse=True)
    return imgs[0]


def _find(net, compartment, vcn_id, method, display_name):
    kwargs = {"compartment_id": compartment}
    if vcn_id:
        kwargs["vcn_id"] = vcn_id
    data = getattr(net, method)(**kwargs).data
    return next((r for r in data if r.display_name == display_name), None)


def create_vcn_net(compartment, ad_name):
    net = oci.core.VirtualNetworkClient(CONFIG)

    vcn = _find(net, compartment, None, "list_vcns", f"{VM_NAME}-vcn")
    if not vcn:
        vcn = net.create_vcn(
            oci.core.models.CreateVcnDetails(
                compartment_id=compartment, cidr_block=VCN_CIDR,
                display_name=f"{VM_NAME}-vcn", dns_label="kraefegg",
            )
        ).data
    print("VCN:", vcn.id)

    igw = _find(net, compartment, vcn.id, "list_internet_gateways", f"{VM_NAME}-igw")
    if not igw:
        igw = net.create_internet_gateway(
            oci.core.models.CreateInternetGatewayDetails(
                compartment_id=compartment, is_enabled=True,
                vcn_id=vcn.id, display_name=f"{VM_NAME}-igw",
            )
        ).data
    print("IGW:", igw.id)

    rt = _find(net, compartment, vcn.id, "list_route_tables", f"{VM_NAME}-rt")
    if not rt:
        rt = net.create_route_table(
            oci.core.models.CreateRouteTableDetails(
                compartment_id=compartment, vcn_id=vcn.id,
                display_name=f"{VM_NAME}-rt",
                route_rules=[
                    oci.core.models.RouteRule(
                        destination="0.0.0.0/0", destination_type="CIDR_BLOCK",
                        network_entity_id=igw.id,
                    )
                ],
            )
        ).data
    print("RouteTable:", rt.id)

    sl = _find(net, compartment, vcn.id, "list_security_lists", f"{VM_NAME}-sl")
    if not sl:
        sl = net.create_security_list(
            oci.core.models.CreateSecurityListDetails(
                compartment_id=compartment, vcn_id=vcn.id,
                display_name=f"{VM_NAME}-sl",
                ingress_security_rules=[
                    oci.core.models.IngressSecurityRule(
                        source="0.0.0.0/0", protocol="6", tcp_options=oci.core.models.TcpOptions(
                            destination_port_range=oci.core.models.PortRange(min=22, max=22)
                        ),
                    ),
                    oci.core.models.IngressSecurityRule(
                        source="0.0.0.0/0", protocol="6", tcp_options=oci.core.models.TcpOptions(
                            destination_port_range=oci.core.models.PortRange(min=4096, max=4096)
                        ),
                    ),
                ],
                egress_security_rules=[
                    oci.core.models.EgressSecurityRule(destination="0.0.0.0/0", protocol="all")
                ],
            )
        ).data
    print("SecurityList:", sl.id)

    ad_str = ad_name if isinstance(ad_name, str) else ad_name.name
    subnet = None
    for s in net.list_subnets(compartment_id=compartment, vcn_id=vcn.id).data:
        if s.display_name == f"{VM_NAME}-subnet" and s.availability_domain == ad_str:
            subnet = s
            break
    if not subnet:
        subnet = net.create_subnet(
            oci.core.models.CreateSubnetDetails(
                compartment_id=compartment, vcn_id=vcn.id, cidr_block=SUBNET_CIDR,
                display_name=f"{VM_NAME}-subnet", dns_label="publica",
                route_table_id=rt.id, security_list_ids=[sl.id],
                availability_domain=ad_str,
            )
        ).data
    print("Subnet:", subnet.id)
    return subnet.id


def launch(compartment, ad_name, img):
    if not FINGERPRINT:
        raise SystemExit(
            "OCI_FINGERPRINT vazio — adicione a api_key_public.pem em "
            "Console → Profile → API Keys e grave o fingerprint em ~/.oci/oci_auth.env"
        )
    compute = oci.core.ComputeClient(CONFIG)
    subnet_id = create_vcn_net(compartment, ad_name)
    for ocpus, mem in SIZES:
        for _ in range(3):
            try:
                inst = compute.launch_instance(
                    oci.core.models.LaunchInstanceDetails(
                        compartment_id=compartment,
                        availability_domain=ad_name.name,
                        display_name=VM_NAME,
                        source_details=oci.core.models.InstanceSourceViaImageDetails(
                            image_id=img.id, boot_volume_size_in_gbs=50
                        ),
                        shape="VM.Standard.A1.Flex",
                        shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(
                            ocpus=ocpus, memory_in_gbs=mem
                        ),
                        subnet_id=subnet_id,
                        metadata={"ssh_authorized_keys": get_ssh_key()},
                        is_pv_encryption_in_transit_enabled=True,
                    )
                ).data
                _log(f"Instância: {inst.id} | {inst.lifecycle_state} | {ocpus} OCPU / {mem} GB")
                return True
            except oci.exceptions.ServiceError as e:
                msg = str(e)
                if "Out of host capacity" in msg:
                    print(f"  {ocpus} OCPU / {mem} GB no {ad_name.name}: sem capacidade")
                    break
                if "Too many requests" in msg:
                    print(f"  {ocpus} OCPU / {mem} GB: throttled — aguardando {RETRY_WAIT}s")
                    time.sleep(RETRY_WAIT)
                    continue
                raise
    return False


def main():
    identity = oci.identity.IdentityClient(CONFIG)
    compute = oci.core.ComputeClient(CONFIG)
    net = oci.core.VirtualNetworkClient(CONFIG)
    if find_instance(compute, net, COMPARTMENT):
        return
    img = find_ubuntu_image(compute, COMPARTMENT)
    _log(f"Imagem: {img.display_name} {img.id}")
    ads = [a for a in identity.list_availability_domains(compartment_id=COMPARTMENT).data
           if any(s.shape == "VM.Standard.A1.Flex" for s in compute.list_shapes(
               compartment_id=COMPARTMENT, availability_domain=a.name).data)]
    if not ads:
        _log("Shape A1.Flex indisponível nos ADs desta região")
        raise SystemExit("Shape A1.Flex indisponível nos ADs desta região")
    for attempt in range(1, RETRIES + 1):
        for ad in ads:
            _log(f"[tentativa {attempt}/{RETRIES}] AD: {ad.name}")
            if launch(COMPARTMENT, ad, img):
                _log("Instância criada com sucesso.")
                return
        if attempt < RETRIES:
            _log(f"Sem capacidade — aguardando {RETRY_WAIT}s para nova tentativa...")
            time.sleep(RETRY_WAIT)
    _log("Sem capacidade A1.Flex (Out of host capacity) após todas as tentativas")
    raise SystemExit("Sem capacidade A1.Flex (Out of host capacity) após todas as tentativas")


if __name__ == "__main__":
    main()
