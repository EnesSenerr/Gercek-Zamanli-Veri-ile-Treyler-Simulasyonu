# Gerçek Zamanlı Veri ile Treyler Simülasyonu 🚛

Bu proje, araçların pasif ve aktif durumlarını yönetmek için bir web tabanlı uygulama geliştirme çalışmasıdır. Sistemde araçların konum bilgilerini Kafka aracılığıyla iletmek, pasif olan araçları belirlemek ve bu araçları görselleştirmek gibi özellikler bulunur.

> **Not:** Bu proje, **Ubuntu** üzerinde geliştirilmiştir. Kafka'nın Ubuntu üzerinde kolay kurulumu ve yönetimi nedeniyle bu platform tercih edilmiştir.

---

## Özellikler 🌟
- **Aktif/Pasif Araç Yönetimi**: Araçların durumlarını yönetebilir ve gerektiğinde pasif araçları listeleyebilirsiniz.
- **WebSocket ve KafkaJS Entegrasyonu**: Gerçek zamanlı veri akışı sağlanır.
- **API Desteği**: Araç bilgilerini API ile sorgulayarak veri çekebilirsiniz.
- **Harita Entegrasyonu**: Araçların konumlarını harita üzerinde görüntüleyebilirsiniz.
- **Sistem Yönetimi**: Aktif araçları durdurabilir veya yeniden başlatabilirsiniz.
- **SQLite3 Entegrasyonu**: Araç verilerini ve alarmları SQLite veritabanında saklayabilirsiniz.

---

## Kurulum 🛠️
Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları takip edebilirsiniz:

### 1. Gereksinimler
- **Ubuntu**: Proje, Kafka'nın kolay kurulumu için Ubuntu üzerinde geliştirilmiştir.
- **Node.js**: v20.16.0
- **Kafka**: Kafka'nın çalışır durumda olması gerekir.
- **Git**: Kodları klonlamak için.
- **NPM veya Yarn**: Bağımlılıkları yüklemek için.
- **SQLite3**: Veritabanı için kullanılır.

### 2. Kafka'nın Ubuntu Üzerinde Kurulumu
Kafka'yı Ubuntu üzerinde kurmak için şu adımları izleyebilirsiniz:
1. **Java'yı yükleyin**:
   ```bash
   sudo apt update
   sudo apt install openjdk-11-jre

    Kafka'yı indirin:
    Kafka'nın en güncel sürümünü Apache Kafka resmi web sitesi üzerinden indirin.
    Kafka'yı çıkarın ve çalıştırın:

    tar -xvzf kafka_*.tgz
    cd kafka_*/
    bin/zookeeper-server-start.sh config/zookeeper.properties &
    bin/kafka-server-start.sh config/server.properties &

3. Projeyi Klonla

git clone https://github.com/EnesSenerr/Gercek-Zamanli-Veri-ile-Treyler-Simulasyonu.git
cd proje-adi

4. Bağımlılıkları Yükle

npm install

5. Uygulamayı Çalıştır

npm start

6. Web Arayüzüne Eriş

Tarayıcınızdan aşağıdaki adresi ziyaret edin:

http://localhost:3000

Kullanım 📖
Aktif Araçları Listeleme

    Web arayüzünde "Aktif Araçları Göster" tuşuna tıklayarak aktif durumdaki araçları görebilirsiniz.

Pasif Araçları Listeleme

    Web arayüzünde "Pasif Araçları Göster" tuşuna tıklayarak yalnızca pasif araçları listeleyebilirsiniz.

Veri Gönderme

    Bir araç için veri üretmek istiyorsanız, ilgili araç kimliğini seçip "Başlat" tuşuna basabilirsiniz.

Veri Durdurma

    Bir araç için veri gönderimini durdurmak istiyorsanız, "Durdur" tuşunu kullanabilirsiniz.