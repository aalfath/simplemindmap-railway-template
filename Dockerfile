# SimpleMindMap (wanglin2/mind-map) for Railway.
# Upstream ships the built web app (index.html + dist/) in the repo and its own Dockerfile
# just copies them into nginx. We do the same at a pinned release commit, verified by checksum,
# and add server-side storage on a volume (nginx WebDAV PUT) behind basic auth.

ARG NGINX_IMAGE=nginx:1.30.8-alpine@sha256:eb37f58646a901dc7727cf448cae36daaefaba79de33b5058dab79aa4c04aefb

FROM ${NGINX_IMAGE} AS src
# Release 0.20.0 (tag 0.20.0 = commit e8e5ef9c41bc13ca7b13084e078123adff002242)
ARG MINDMAP_VERSION=0.20.0
ARG MINDMAP_COMMIT=e8e5ef9c41bc13ca7b13084e078123adff002242
ARG MINDMAP_SHA256=87d7519c755aa1219a83e85fb6f57b2bf431dff985aae90b199d8a26398e56db
COPY railway-sync.js /tmp/railway-sync.js
RUN set -eux; \
    wget -q -O /tmp/mm.tar.gz "https://codeload.github.com/wanglin2/mind-map/tar.gz/${MINDMAP_COMMIT}"; \
    echo "${MINDMAP_SHA256}  /tmp/mm.tar.gz" | sha256sum -c -; \
    mkdir -p /tmp/mm /app; \
    tar xzf /tmp/mm.tar.gz -C /tmp/mm --strip-components=1; \
    cp -r /tmp/mm/index.html /tmp/mm/dist /tmp/mm/LICENSE /app/; \
    cp /tmp/railway-sync.js /app/railway-sync.js; \
    cd /app; \
    # Replace the upstream page's third-party analytics tag (sdk.51.la) with our storage sync script,
    # which must run before the app's own scripts. LA.init() below it sits in try/catch upstream.
    sed -i 's#<script charset="UTF-8" id="LA_COLLECT" src="//sdk\.51\.la/js-sdk-pro\.min\.js"></script>#<script src="railway-sync.js?v='"${MINDMAP_VERSION}"'"></script>#' index.html; \
    sed -i 's#<title>[^<]*</title>#<title>SimpleMindMap</title>#' index.html; \
    grep -q 'railway-sync.js' index.html; \
    ! grep -q '51\.la/js-sdk' index.html; \
    echo "${MINDMAP_VERSION}" > /app/VERSION; \
    rm -r /tmp/mm /tmp/mm.tar.gz

FROM ${NGINX_IMAGE}
COPY --from=src /app /app
COPY nginx.conf.template /etc/nginx/simplemindmap.conf.template
COPY start.sh /usr/local/bin/simplemindmap-start
RUN chmod 755 /usr/local/bin/simplemindmap-start && rm -f /etc/nginx/conf.d/default.conf
ENV PORT=8080
EXPOSE 8080
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/usr/local/bin/simplemindmap-start"]
