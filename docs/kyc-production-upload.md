# KYC production upload requirements

KYC accepts up to three image files at 8 MB each. The reverse proxy must allow
multipart overhead as well:

```nginx
location /api/kyc/ {
    client_max_body_size 30m;
    proxy_read_timeout 75s;
    proxy_send_timeout 75s;
    proxy_pass http://127.0.0.1:3000;
}
```

The current implementation uses local filesystem storage; the
`KYC_STORAGE_*` object-storage variables are not consumed. Configure
`KYC_DATA_DIR=/var/lib/bitvora/kyc`, create it before starting the app, grant
the application service user read/write access, and mount it on persistent
storage.

Example deployment checks:

```sh
sudo install -d -o bitvora -g bitvora -m 0700 /var/lib/bitvora/kyc
sudo -u bitvora test -w /var/lib/bitvora/kyc
df -h /var/lib/bitvora/kyc
sudo nginx -t
sudo systemctl reload nginx
```

Next.js Route Handlers read multipart requests with `request.formData()` and
the application does not set a smaller body limit. Do not manually add a
multipart `Content-Type` request header; the browser must generate its
boundary.
