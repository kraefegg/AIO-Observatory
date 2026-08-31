# KRAEFEGG M.O. - Plataforma Corporativa (app web estático no Code Engine)
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY kraefegg-mo.html /usr/share/nginx/html/index.html
COPY logo.png /usr/share/nginx/html/logo.png
COPY banner.png /usr/share/nginx/html/banner.png
EXPOSE 8080
