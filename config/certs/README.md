# SSL Certificate Pinning

This directory contains CA certificates for certificate pinning to prevent MITM attacks.

## NASA Exoplanet Archive Certificate

The `nasa_ca_bundle.pem` file contains the SSL certificate chain for `exoplanetarchive.ipac.caltech.edu`.

### Updating the Certificate

Certificates expire and need to be refreshed periodically. To update:

```bash
echo | openssl s_client -showcerts -servername exoplanetarchive.ipac.caltech.edu \
  -connect exoplanetarchive.ipac.caltech.edu:443 2>/dev/null | \
  openssl x509 -outform PEM > config/certs/nasa_ca_bundle.pem
```

### Verification

To verify the certificate:

```bash
openssl x509 -in config/certs/nasa_ca_bundle.pem -text -noout
```

Check the expiration date:

```bash
openssl x509 -in config/certs/nasa_ca_bundle.pem -noout -dates
```

## Security Note

If the certificate file is missing, the application will still work but without certificate pinning (falling back to standard VERIFY_PEER mode). However, for production deployments, certificate pinning is strongly recommended.

