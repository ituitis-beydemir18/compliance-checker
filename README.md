Usage
======

```bash
terraform plan
terraform apply
```

Update/Deploy Lambda Function
===

```bash
1. Update handler.mjs
2. Zip "handler.mjs" file directly into handler.zip
3. terraform apply this will detect change on handler.zip file's hash)
```


Known Issue: DynamoDB throws ThrottlingRateException - Possibly CloudTrail - Docs/bug-ss-1.png