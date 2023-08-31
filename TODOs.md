[] Şuan scope'unda EC2 bulunan bütün AWS Config rule'ları kontrol ediliyor. Oysa ki sadece belli bir isme sahip rule'un bütün scope'u (EC2+tüm diğer servisler) taranmalı. Bu rule'un ismi terraform vars'tan alınabilir.

[] AWS SDK call'larında NextToken pagination desteği

[] Lambda TagKey diye bir env değişkeni alıyor ama buna ihtiyacı yok.

[] Lambda Execution Role yetkileri kontrol edilmeli (lambda.tf)