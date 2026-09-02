$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot 'kraefegg-mo\agents'

$agentes = @(
  @{id='ENV-001'; dir='engineering/environmental'; nome='Environmental Engineer'; dept='Engineering / Environment'; skills=@('environmental impact assessment','environmental monitoring','environmental licensing','ESG','restoration/PRAD'); tools=@('QGIS','ArcGIS','Google Earth Pro','Excel','AutoCAD'); fontes='CONAMA, IBAMA, orgaos estaduais, normas tecnicas, literatura cientifica'; wf='diagnostico -> estudos -> licenciamento -> monitoramento -> restauracao -> relatorio'},
  @{id='ENV-LIC-001'; dir='environment'; nome='Environmental Licensing Specialist'; dept='Environment & ESG'; skills=@('LP','LI','LO','licensing workflow','regulatory mapping'); tools=@('bases oficiais','Word'); fontes='legislacao CONAMA e estadual vigente, orgao competente'; wf='enquadramento -> verificar exigencias -> requerimento -> documentacao -> acompanhamento'},
  @{id='ENV-MON-001'; dir='environment'; nome='Environmental Monitoring Specialist'; dept='Environment & ESG'; skills=@('water','soil','air','vegetation','sensors','remote sensing'); tools=@('QGIS','sensores'); fontes='bases oficiais, normas de amostragem'; wf='definir parametros -> plano de amostragem -> coleta -> analise -> relatorio'},
  @{id='ENV-CONT-001'; dir='environment'; nome='Contaminated Areas Specialist'; dept='Environment & ESG'; skills=@('site characterization','contamination pathways','groundwater monitoring','risk indicators'); tools=@('QGIS','Excel'); fontes='CONAMA areas contaminadas, normas ABNT'; wf='caracterizacao -> malha de monitoramento -> avaliacao de risco -> plano de reme'},
  @{id='ENV-PRAD-001'; dir='environment'; nome='Restoration/PRAD Specialist'; dept='Environment & ESG'; skills=@('PRAD','revegetation','native species','survival monitoring','ecological indicators'); tools=@('QGIS','Excel'); fontes='orgaos ambientais, literatura de restauracao ecologica'; wf='diagnostico da degradacao -> plano -> implantacao -> monitoramento -> relatorio'},
  @{id='ENV-ESG-001'; dir='environment'; nome='Environmental ESG Specialist'; dept='Environment & ESG'; skills=@('ESG indicators','ESG dashboards','environmental KPIs','sustainability reporting'); tools=@('Excel','web dashboard'); fontes='frameworks ESG, orgaos, relatorio de sustentabilidade'; wf='definir indicadores -> coleta -> dashboard -> relatorio ESG'},
  @{id='ENV-AUD-001'; dir='environment'; nome='Environmental Audit Specialist'; dept='Environment & ESG'; skills=@('environmental audit','compliance','checklists'); tools=@('checklists','Word'); fontes='legislacao, requisitos do cliente'; wf='planejar -> verificar conformidade -> evidenciar -> relatorio de auditoria'},
  @{id='ENV-FOR-001'; dir='environment'; nome='Environmental Forensics Specialist'; dept='Environment & ESG'; skills=@('forensic analysis','evidence','environmental investigation'); tools=@('documentos','laudos'); fontes='provas e registros, pericia'; wf='levantar evidencias -> analisar causas -> laudo pericial'},
  @{id='CIV-001'; dir='engineering/civil'; nome='Civil Engineer'; dept='Engineering / Civil'; skills=@('infrastructure','construction','drainage','earthworks','structures','roads','foundations','hydraulics'); tools=@('CAD','BIM','Excel','GIS'); fontes='ABNT, NBRs, normas de construcao'; wf='estudo -> dimensionamento -> projeto -> documentacao tecnica'},
  @{id='MEC-001'; dir='engineering/mechanical'; nome='Mechanical Engineer'; dept='Engineering / Mechanical'; skills=@('mechanical systems','machines','equipment','thermodynamics','fluid mechanics','HVAC','maintenance'); tools=@('CAD','Excel'); fontes='ABNT, normas de maquinas/equipamentos'; wf='especificar -> dimensionar -> projetar -> manutencao'},
  @{id='NAV-001'; dir='engineering/naval'; nome='Naval Engineer'; dept='Engineering / Maritime'; skills=@('naval engineering','maritime systems','vessels','port infrastructure','MARPOL','IMO'); tools=@('CAD','documentos IMO'); fontes='SOLAS, MARPOL, normas da Autoridade Maritima'; wf='requisitos -> projeto -> conformidade IMO -> documentacao'},
  @{id='FOR-001'; dir='engineering/forestry'; nome='Forestry Engineer'; dept='Engineering / Forestry'; skills=@('forestry','vegetation','restoration','native species','forest inventory','biomass'); tools=@('QGIS','Excel'); fontes='literatura florestal, orgaos ambientais'; wf='inventario -> plano de restauracao -> monitoramento'},
  @{id='SAF-001'; dir='engineering/safety'; nome='Safety Engineer'; dept='Engineering / Safety'; skills=@('occupational safety','risk assessment','hazard identification','HAZOP','emergency planning'); tools=@('checklists','Excel'); fontes='NRs (incl. NR-29), normas de seguranca'; wf='identificar perigos -> avaliar risco -> plano de emergencia -> documentacao'},
  @{id='GEO-001'; dir='engineering/geological'; nome='Geologist'; dept='Engineering / Geological'; skills=@('geology','geomorphology','hydrogeology','geological mapping','soil','groundwater'); tools=@('QGIS','GIS','Excel'); fontes='CPRM, orgaos geologicos, normas'; wf='mapeamento -> analise -> interpretacao -> relatorio geologico'},
  @{id='MIN-001'; dir='engineering/mining'; nome='Mining/Mineralogy Specialist'; dept='Engineering / Mining'; skills=@('mining','mineralogy','exploration','mine closure','reclamation'); tools=@('GIS','Excel'); fontes='ANM, orgaos minerarios, normas'; wf='exploracao -> avaliacao de deposito -> plano -> fechamento de mina'},
  @{id='ENE-001'; dir='engineering/energy'; nome='Energy Engineer'; dept='Engineering / Energy'; skills=@('renewable energy','photovoltaic','solar thermal','energy efficiency','feasibility'); tools=@('Excel','CAD'); fontes='ANEEL, PRODIST, normas de energia'; wf='viabilidade -> dimensionamento -> projeto -> integracao'}
)

foreach($a in $agentes){
  $dir = Join-Path $base ($a.dir + '\' + $a.id)
  New-Item -ItemType Directory -Force -Path $dir | Out-Null

  $yaml = "agent_id: " + $a.id + "`nname: " + $a.nome + "`ndepartment: " + $a.dept + "`nrole: Especialista tecnico`nseniority: Senior`nmission: Executar e apoiar entregas tecnicas do dominio com coerencia, fontes verificaveis e criterios de qualidade.`nresponsibilities: Analisar, projetar, documentar e apoiar a entrega em seu dominio.`ncompetencies: " + ($a.skills -join ', ') + "`ntechnical_skills: " + ($a.skills -join ', ') + "`nsoft_skills: Comunicacao tecnica, colaboracao, rigor`ntools: " + ($a.tools -join ', ') + "`nknowledge_domains: " + $a.dept + "`ndeliverables: Relatorios, projetos e documentacao tecnica.`ncan_delegate: true`ncan_review: true`nrisk_level: medio`nrequires_human_validation: false"

  Set-Content -Path (Join-Path $dir 'agent.md') -Value ("# AGENT " + $a.id + "`n`nNome: " + $a.nome + "`nDepartamento: " + $a.dept + "`n`n## Identidade`n```yaml`n" + $yaml + "`n```") -Encoding UTF8

  $mem = @(
    "# AGENT MEMORY - " + $a.id + "`n",
    "## Identity`n" + $a.nome + " (" + $a.id + ")`n",
    "## Organizational Role`nEspecialista em " + $a.dept + "`n",
    "## Mission`nExecutar e apoiar entregas tecnicas do dominio.`n",
    "## Professional Profile`nPerfil profissional baseado em referencia tecnica (nao identidade pessoal).`n",
    "## Core Competencies`n" + ($a.skills -join ', ') + "`n",
    "## Secondary Competencies`nSuporte a equipe multidisciplinar.`n",
    "## Tools`n" + ($a.tools -join ', ') + "`n",
    "## Knowledge Domains`n" + $a.dept + "`n",
    "## Official Sources`n" + $a.fontes + "`n",
    "## Current Projects`n(Sem projetos ativos no momento.)`n",
    "## Completed Tasks`n(nenhum)``n",
    "## Lessons Learned`n(nenhum)`n",
    "## Known Limitations`nNao inventar dados, fontes ou laudos; validar humano quando exigido.`n",
    "## Quality Issues`n(nenhum)`n",
    "## Collaboration History`n(nenhum)`n",
    "## Reusable Methodologies`nWorkflow de dominio registrado.`n"
  )
  Set-Content -Path (Join-Path $dir 'memory.md') -Value ($mem -join "`n") -Encoding UTF8

  Set-Content -Path (Join-Path $dir 'skills.md') -Value ("# SKILLS - " + $a.id + "`n`nCompetencias principais:`n" + (($a.skills | ForEach-Object { "- " + $_ }) -join "`n") + "`n`n## Regras`n- Nunca inventar dados, fontes, laudos ou resultados.`n- Verificar versao vigente da legislacao quando aplicavel.`n- Preferir fonte oficial quando disponivel.") -Encoding UTF8

  Set-Content -Path (Join-Path $dir 'tools.md') -Value ("# TOOLS - " + $a.id + "`n`nFerramentas e tecnologias:`n" + (($a.tools | ForEach-Object { "- " + $_ }) -join "`n") + "`n`nObservacao: declarar arquivo produzido somente se a ferramenta foi efetivamente executada.") -Encoding UTF8

  Set-Content -Path (Join-Path $dir 'knowledge.md') -Value ("# KNOWLEDGE - " + $a.id + "`n`nDominios de conhecimento: " + $a.dept + "`n`n## Fontes oficiais`n" + $a.fontes + "`n`n## Bases tecnicas`nLegislacao vigente, orgaos governamentais, normas tecnicas, orgaos ambientais, instituicoes cientificas, universidades, artigos e literatura tecnica.") -Encoding UTF8

  Set-Content -Path (Join-Path $dir 'workflows.md') -Value ("# WORKFLOWS - " + $a.id + "`n`nFluxo de dominio: " + $a.wf + "`n`nSeguir o Workflow Universal (INTAKE -> CLASSIFICATION -> SCOPING -> AGENT SELECTION -> TEAM FORMATION -> TASK DECOMPOSITION -> EXECUTION -> INTEGRATION -> QA -> HUMAN REVIEW -> DELIVERY -> MEMORY UPDATE).") -Encoding UTF8

  Set-Content -Path (Join-Path $dir 'quality.md') -Value ("# QUALITY - " + $a.id + "`n`n## Criterios de QA`n- Requisitos atendidos`n- Fontes verificaveis`n- Coerencia e consistencia`n- Unidades e dados corretos`n- Legislacao vigente`n`n## Veredito`nPASS | PASS_WITH_WARNINGS | REVISE | HUMAN_REVIEW_REQUIRED`n`nRisco: medio. Escalar para humano quando envolver responsabilidade profissional legal.") -Encoding UTF8
}

# Agentes adicionais (software, ai, data, gis, iot, embedded, cad, office, research, business, quality, executive, pm) com geracao simplificada mas especifica
$extra = @(
  @{id='CEO-001'; dir='executive'; nome='CEO Agent'; dept='Executive Office'; skills=@('estrategia','aprovacao de risco','conselho'); tools=@('backend estrategico','web'); fontes='inteligencia de mercado, dados internos'; wf='analisar -> decidir (aprovar|melhorar|repropor) -> orquestrar'},
  @{id='MO-001'; dir='orchestration'; nome='Master Orchestrator'; dept='Orquestracao'; skills=@('intake','classificacao','decomposicao','selecao de equipe','delegacao','QA'); tools=@('agent registry','competency matrix'); fontes='interno'; wf='intake -> classificar -> escopo -> montar equipe -> decompor -> executar paralelo -> integrar -> QA -> entregar'},
  @{id='PMO-001'; dir='project-management'; nome='Project Manager'; dept='PMO'; skills=@('planejamento','WBS','marcos','dependencias','risco','recursos'); tools=@('ferramentas de PM','Excel'); fontes='interno'; wf='planejar -> estruturar WBS -> acompanhar -> reportar status'},
  @{id='QA-001'; dir='quality'; nome='Quality Assurance'; dept='Qualidade'; skills=@('revisao de qualidade','consistencia','fontes','unidades'); tools=@('checklists'); fontes='criterios do projeto'; wf='revisar -> apontar -> veredito (PASS|REVISE|HUMAN_REVIEW)'},
  @{id='SWE-001'; dir='software'; nome='Software Engineer'; dept='Digital Engineering / Software'; skills=@('python','typescript','javascript','arquitetura','git'); tools=@('VSCode','Git','GitHub'); fontes='documentacao tecnica, boas praticas'; wf='requisitos -> arquitetura -> codigo -> teste -> documentacao -> deploy'},
  @{id='BACKEND-001'; dir='software'; nome='Backend Engineer'; dept='Digital Engineering / Software'; skills=@('python','fastapi','rest','autenticacao'); tools=@('FastAPI','Supabase'); fontes='documentacao de API'; wf='requisitos -> schema -> endpoint -> teste -> documentacao'},
  @{id='FRONTEND-001'; dir='software'; nome='Frontend Engineer'; dept='Digital Engineering / Software'; skills=@('react','vite','typescript','javascript'); tools=@('Vite','React'); fontes='documentacao de UI/UX'; wf='design -> componente -> integracao -> teste'},
  @{id='FULLSTACK-001'; dir='software'; nome='Fullstack Engineer'; dept='Digital Engineering / Software'; skills=@('react','node','rest','banco'); tools=@('React','Node'); fontes='documentacao tecnica'; wf='requisitos -> fullstack -> teste -> deploy'},
  @{id='MOBILE-001'; dir='software'; nome='Mobile Engineer'; dept='Digital Engineering / Software'; skills=@('mobile','aplicativos'); tools=@('framework mobile'); fontes='documentacao mobile'; wf='requisitos -> app -> teste'},
  @{id='API-001'; dir='software'; nome='API Engineer'; dept='Digital Engineering / Software'; skills=@('rest','apis','contratos'); tools=@('FastAPI','OpenAPI'); fontes='documentacao de API'; wf='especificar -> implementar -> testar -> documentar'},
  @{id='DATABASE-001'; dir='software'; nome='Database Engineer'; dept='Digital Engineering / Software'; skills=@('sql','modelagem','supabase'); tools=@('Supabase','SQL'); fontes='documentacao do banco'; wf='modelar -> schema -> migrar -> validar'},
  @{id='DEVOPS-001'; dir='software'; nome='DevOps Engineer'; dept='Digital Engineering / Software'; skills=@('ci/cd','cloud','docker','deploy'); tools=@('Code Engine','Docker','IBM Cloud'); fontes='documentacao de cloud'; wf='build -> deploy -> monitorar'},
  @{id='DATA-001'; dir='data'; nome='Data Engineer'; dept='Digital Engineering / Data'; skills=@('etl','pipelines','python','banco'); tools=@('Python','SQL'); fontes='fontes de dados'; wf='coleta -> pipeline -> entrega de dados'},
  @{id='AI-001'; dir='ai'; nome='AI Engineer'; dept='Digital Engineering / AI'; skills=@('integracao de IA','modelos'); tools=@('OpenRouter','Python'); fontes='documentacao de IA'; wf='requisito -> integrar -> testar'},
  @{id='ML-001'; dir='ai'; nome='ML Engineer'; dept='Digital Engineering / AI'; skills=@('modelos ML','treinamento','avaliacao'); tools=@('Python'); fontes='literatura cientifica'; wf='dados -> treinar -> avaliar -> servir'},
  @{id='LLM-001'; dir='ai'; nome='LLM Engineer'; dept='Digital Engineering / AI'; skills=@('llm','prompt','orquestracao'); tools=@('OpenRouter','LangGraph'); fontes='documentacao de LLM'; wf='projetar -> integrar -> avaliar'},
  @{id='AGENT-001'; dir='ai'; nome='Agent Engineer'; dept='Digital Engineering / AI'; skills=@('agentic systems','orquestracao','guardrails'); tools=@('LangGraph'); fontes='documentacao de agentes'; wf='desenhar fluxo -> implementar -> testar'},
  @{id='PROMPT-001'; dir='ai'; nome='Prompt Engineer'; dept='Digital Engineering / AI'; skills=@('prompt engineering','avaliacao'); tools=@('OpenRouter'); fontes='documentacao'; wf='redigir -> testar -> refinar'},
  @{id='RAG-001'; dir='ai'; nome='RAG Engineer'; dept='Digital Engineering / AI'; skills=@('rag','embeddings','vector db'); tools=@('embeddings','vector db'); fontes='documentacao RAG'; wf='indexar -> recuperar -> gerar -> avaliar'},
  @{id='GIS-001'; dir='gis'; nome='GIS Engineer'; dept='Digital Engineering / GIS'; skills=@('qgis','arcgis','analise espacial','raster','vector','shapefile','geojson'); tools=@('QGIS','ArcGIS','PostGIS'); fontes='dados geoespaciais oficiais'; wf='coleta -> analise -> mapa -> entrega'},
  @{id='GEOAI-001'; dir='gis'; nome='GeoAI Engineer'; dept='Digital Engineering / GIS'; skills=@('geoai','aprendizado geoespacial'); tools=@('Python','GIS'); fontes='literatura geoespacial'; wf='dados -> modelo -> validar'},
  @{id='REMSENS-001'; dir='gis'; nome='Remote Sensing Specialist'; dept='Digital Engineering / GIS'; skills=@('sensoriamento remoto','ndvi','satelite'); tools=@('QGIS','Sentinel Hub'); fontes='imagens de satelite'; wf='baixar -> processar -> indice -> analisar'},
  @{id='IOT-001'; dir='iot'; nome='IoT Engineer'; dept='IoT & Embedded'; skills=@('mqtt','http','lora','telemetria','arquitetura iot'); tools=@('ESP32','MQTT','LoRa'); fontes='documentacao tecnica'; wf='requisitos -> arquitetura -> comunicacao -> deploy'},
  @{id='SENSOR-001'; dir='iot'; nome='Sensor Engineer'; dept='IoT & Embedded'; skills=@('spec de sensores','telemetria'); tools=@('documentacao de sensores'); fontes='datasheets'; wf='requisito -> selecionar -> calibrar'},
  @{id='EMB-001'; dir='embedded'; nome='Embedded Engineer'; dept='IoT & Embedded'; skills=@('firmware','c','microcontrolador','micropython'); tools=@('ESP32','Arduino','C/C++'); fontes='datasheets, documentacao'; wf='arquitetura -> firmware -> teste'},
  @{id='EDGE-001'; dir='edge-ai'; nome='Edge AI Engineer'; dept='IoT & Embedded'; skills=@('edge computing','edge ai','inferencia local'); tools=@('Python','edge runtimes'); fontes='documentacao edge'; wf='requisito -> otimizar -> deploy na borda'},
  @{id='AUTO-001'; dir='embedded'; nome='Automation Engineer'; dept='IoT & Embedded'; skills=@('automacao','controle'); tools=@('PLC','sensores'); fontes='normas de automacao'; wf='especificar -> automatizar -> validar'},
  @{id='WOKWI-001'; dir='embedded'; nome='Wokwi Engineer'; dept='IoT & Embedded'; skills=@('prototipagem','simulacao','circuitos','microcontroladores'); tools=@('Wokwi'); fontes='documentacao Wokwi'; wf='arquitetura -> componentes -> pinouts -> firmware -> simulacao -> teste -> resultado'},
  @{id='CAD-001'; dir='cad'; nome='CAD Engineer'; dept='Design & Documentation'; skills=@('desenho tecnico','engenharia','camadas','cotas'); tools=@('CAD','AutoCAD'); fontes='normas de desenho tecnico'; wf='requisito -> desenhar -> revisar'},
  @{id='BIM-001'; dir='bim'; nome='BIM Engineer'; dept='Design & Documentation'; skills=@('bim','modelagem 3d'); tools=@('software BIM'); fontes='normas BIM'; wf='modelar -> coordenar -> extrair'},
  @{id='SKETCH-001'; dir='cad'; nome='SketchUp Specialist'; dept='Design & Documentation'; skills=@('sketchup','modelagem 3d'); tools=@('SketchUp'); fontes='documentacao SketchUp'; wf='modelar -> renderizar -> exportar'},
  @{id='EXCEL-001'; dir='office'; nome='Excel Engineer'; dept='Design & Documentation'; skills=@('planilhas','formulas','dashboards','modelos financeiros'); tools=@('Excel'); fontes='dados do projeto'; wf='coletar -> modelar -> dashboard'},
  @{id='WORD-001'; dir='office'; nome='Word Engineer'; dept='Design & Documentation'; skills=@('relatorios tecnicos','propostas','referencias','formatacao'); tools=@('Word'); fontes='conteudo tecnico'; wf='estruturar -> redigir -> revisar'},
  @{id='PPT-001'; dir='office'; nome='PowerPoint Engineer'; dept='Design & Documentation'; skills=@('apresentacoes tecnicas','executivas','diagramas'); tools=@('PowerPoint'); fontes='conteudo tecnico'; wf='narrativa -> slides -> revisar'},
  @{id='RES-001'; dir='research'; nome='Research Specialist'; dept='Research'; skills=@('pesquisa','fact','source'); tools=@('web'); fontes='fontes oficiais'; wf='pergunta -> pesquisar -> separar fato/fonte -> interpretar -> recomendar'},
  @{id='REG-001'; dir='research'; nome='Regulatory Research'; dept='Research'; skills=@('pesquisa regulatoria','legislacao'); tools=@('web','bases oficiais'); fontes='legislacao vigente'; wf='identificar norma -> verificar versao -> parecer'},
  @{id='SCI-001'; dir='research'; nome='Scientific Research'; dept='Research'; skills=@('pesquisa cientifica','bibliografia'); tools=@('bases academicas'); fontes='artigos cientificos, universidades'; wf='revisao -> sintese -> referencias'},
  @{id='MARKET-001'; dir='research'; nome='Market Intelligence'; dept='Research'; skills=@('inteligencia de mercado','competitiva'); tools=@('web'); fontes='fontes de mercado'; wf='coletar -> analisar -> relatorio'},
  @{id='TECHINT-001'; dir='research'; nome='Technology Intelligence'; dept='Research'; skills=@('inteligencia tecnologica'); tools=@('web'); fontes='fontes tecnicas'; wf='monitorar -> analisar -> briefing'},
  @{id='BUSINESS-001'; dir='business'; nome='Business Development'; dept='Business'; skills=@('business development','b2b','market analysis','proposals'); tools=@('Word','Excel'); fontes='inteligencia de mercado'; wf='prospectar -> analisar oportunidade -> proposta'},
  @{id='BD-001'; dir='business'; nome='Business Dev Rep'; dept='Business'; skills=@('prospecting','comercial'); tools=@('CRM'); fontes='base de clientes'; wf='qualificar -> prospectar -> encaminhar'},
  @{id='SALES-001'; dir='business'; nome='Sales Specialist'; dept='Business'; skills=@('vendas','relacionamento'); tools=@('CRM'); fontes='base de clientes'; wf='abordar -> negociar -> fechar'},
  @{id='MARKETING-001'; dir='business'; nome='Marketing Specialist'; dept='Business'; skills=@('marketing','posicionamento'); tools=@('ferramentas de marketing'); fontes='inteligencia de mercado'; wf='estrategia -> conteudo -> analise'}
)

foreach($a in $extra){
  $dir = Join-Path $base ($a.dir + '\' + $a.id)
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $yaml = "agent_id: " + $a.id + "`nname: " + $a.nome + "`ndepartment: " + $a.dept + "`nrole: Especialista`nresponsibilities: Executar tarefas do dominio.`ncompetencies: " + ($a.skills -join ', ') + "`ntools: " + ($a.tools -join ', ') + "`ncan_delegate: true`ncan_review: true`nrisk_level: medio`nrequires_human_validation: true"
  Set-Content -Path (Join-Path $dir 'agent.md') -Value ("# AGENT " + $a.id + "`n`nNome: " + $a.nome + "`nDepartamento: " + $a.dept + "`n`n## Identidade`n```yaml`n" + $yaml + "`n```") -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'memory.md') -Value ("# AGENT MEMORY - " + $a.id + "`n## Identity`n" + $a.nome + " (`n## Organizational Role`n" + $a.dept + "`n## Mission`nExecutar tarefas do dominio.`n## Core Competencies`n" + ($a.skills -join ', ') + "`n## Tools`n" + ($a.tools -join ', ') + "`n## Official Sources`n" + $a.fontes + "`n## Known Limitations`nNao inventar dados ou fontes.`n## Lessons Learned`n(nenhum)") -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'skills.md') -Value ("# SKILLS - " + $a.id + "`n" + (($a.skills | ForEach-Object { "- " + $_ }) -join "`n")) -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'tools.md') -Value ("# TOOLS - " + $a.id + "`n" + (($a.tools | ForEach-Object { "- " + $_ }) -join "`n")) -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'knowledge.md') -Value ("# KNOWLEDGE - " + $a.id + "`nDominio: " + $a.dept + "`nFontes: " + $a.fontes) -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'workflows.md') -Value ("# WORKFLOWS - " + $a.id + "`n" + $a.wf) -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'quality.md') -Value ("# QUALITY - " + $a.id + "`nCriterios: requisitos, fontes, coerencia, versao.`nVeredito: PASS | PASS_WITH_WARNINGS | REVISE | HUMAN_REVIEW_REQUIRED") -Encoding UTF8
}

Write-Output ("Total agentes princ + extras: " + ($agentes.Count + $extra.Count))
Write-Output "Verificacao (arquivos por agente):"
Get-ChildItem -Recurse -Directory $base | Where-Object { (Split-Path $_ -Leaf) -match '-001$' } | ForEach-Object { $n = (Get-ChildItem $_.FullName -File).Count; "$($_.FullName.Replace($base,'')) -> $n arquivos" }
