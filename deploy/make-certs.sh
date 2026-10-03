#!/bin/sh
# Gera a CA interna da Central e o certificado HTTPS do servidor (válidos na rede interna).
#
#   ./deploy/make-certs.sh 10.0.29.220 gamesuporte   # IPs/nomes pelos quais a equipe acessa
#
# Saída em deploy/certs/ (fora do Git):
#   ca.crt      -> instalar UMA vez em cada PC/celular como "Autoridade de certificação raiz confiável"
#   server.crt / server.key -> usados pelo nginx (docker-compose.prod.yml)
# Rodar de novo renova só o certificado do servidor (a CA é reaproveitada).
set -eu
cd "$(dirname "$0")"
mkdir -p certs
cd certs

if [ ! -f ca.key ]; then
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout ca.key -out ca.crt -subj "/CN=Central de Suporte - CA interna"
fi

SAN="DNS:localhost,IP:127.0.0.1"
for host in "$@"; do
  case "$host" in
    *[!0-9.]*) SAN="$SAN,DNS:$host" ;;
    *) SAN="$SAN,IP:$host" ;;
  esac
done

openssl req -newkey rsa:2048 -nodes -keyout server.key -out server.csr -subj "/CN=${1:-localhost}"
printf "subjectAltName=%s\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n" "$SAN" > server.ext
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 -sha256 \
  -extfile server.ext -out server.crt
rm -f server.csr server.ext
chmod 600 ca.key server.key
echo "Certificado gerado para: $SAN"
