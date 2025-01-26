//Kütüphaneler ve gerekli sayfaların import edildiği kısım
const express = require('express');
const { Kafka } = require('kafkajs');
const db = require('./db');
const app = express();
const PORT = 5051;
const WebSocket = require('ws');

// Alarm fonksiyonlarını import ediyoruz
const { startAlarmProducer, checkAlarmConditions } = require('./alarmProducer'); 


app.use(express.json());
app.use(express.static('public'));

const kafka = new Kafka({
    clientId: 'gps-producer',
    brokers: ['localhost:9092'],
});

const topic = 'test2';
const producer = kafka.producer();

// Çalışan truck'ları takip eder
let workers = {}; 

// Her truck'ın son konumunu saklar
let lastPositions = {};

const wss = new WebSocket.Server({ port: 8080 });

// WebSocket bağlantısı kurulduğunda yapılacak işlemler
wss.on('connection', (ws) => {
    console.log('Yeni WebSocket bağlantısı kuruldu.');

    ws.on('message', (message) => {
        const { truckId } = JSON.parse(message);

        if (workers[truckId]) {
            // WebSocket üzerinden gelen truckId'yi kullanarak mevcut veriyi gönder
            const data = lastPositions[truckId];
            if (data) {
                ws.send(JSON.stringify({ truckId, ...data }));
            }
        }
    });

    ws.on('close', () => {
        console.log('WebSocket bağlantısı kapatıldı.');
    });
});

// Truck başlatma işlemi
async function sendTruckData(truckId, latitude, longitude) {
    await producer.connect();
    const timestamp = new Date().toISOString();

    // Eğer truck daha önce durdurulmuşsa, son konumdan devam et
    latitude = lastPositions[truckId]?.latitude || 36.953879 + Math.random() * 0.01;
    longitude = lastPositions[truckId]?.longitude || 34.999076 + Math.random() * 0.01;

    //rastgele lat ve long değerleri ürettiğimiz kısım
    while (workers[truckId]) {

        latitude += Math.random() * 0.02 - 0.01;
        longitude += Math.random() * 0.02 - 0.01;

        const data = {
            truckId,
            timestamp: new Date().toISOString(),
            latitude,
            longitude,
        };

        // Alarm koşullarını kontrol et
        checkAlarmConditions(truckId, latitude, longitude, lastPositions);

        // Son konumu güncelle
        lastPositions[truckId] = { latitude, longitude };

        console.log(`Producing: ${JSON.stringify(data)}`);
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(data) }],
        });

        // Eğer araç pasif durumdaysa veritabanına kaydet
        if (!workers[truckId]) {
            const query = `
                INSERT OR REPLACE INTO truck_locations (truck_id, latitude, longitude, timestamp)
                VALUES (?, ?, ?, ?)
            `;
            db.run(query, [truckId, latitude, longitude, timestamp], (err) => {
                if (err) {
                    console.error('Veritabanı güncellemesi başarısız:', err.message);
                }
            });
        }

        // WebSocket üzerinden bağlantı varsa, veriyi gönder
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ truckId, latitude, longitude, timestamp }));
            }
        });
        // döngüyü 3 saniye de bir çalıştırmak için
        await new Promise(resolve => setTimeout(resolve, 3000)); 
    }
}

// Truck başlatma endpoint'i
app.post('/start-truck', (req, res) => {
    const { truckId } = req.body;

    if (workers[truckId]) {
        return res.status(400).send({ message: 'Bu truck zaten çalışıyor!' });
    }

    // Veritabanından truck konum bilgisini al
    const query = 'SELECT latitude, longitude FROM truck_locations WHERE truck_id = ?';
    db.get(query, [truckId], (err, row) => {
        if (err) {
            console.error('Veri alınamadı:', err.message);
            return res.status(500).send({ message: 'Veri alınamadı' });
        }

        let latitude, longitude;
        if (row) {
            // Eğer kayıt varsa, veritabanındaki konumu al
            latitude = row.latitude;
            longitude = row.longitude;
            console.log(`Truck ${truckId} mevcut konumuyla başlatılıyor.`);
        } else {
            // Eğer kayıt yoksa, random konum oluştur
            latitude = 36.860738 + (Math.random() * 0.02 - 0.01);
            longitude = 34.755371 + (Math.random() * 0.02 - 0.01);
            console.log(`Truck ${truckId} yeni konumla başlatılıyor.`);
        }

        workers[truckId] = true;
        sendTruckData(truckId, latitude, longitude);
        startAlarmProducer(truckId); // Alarm başlatma
        res.send({ message: `Truck ${truckId} başlatıldı.` });
    });
});

// Truck durdurma endpoint'i
app.post('/stop-truck', (req, res) => {
    const { truckId } = req.body;
    if (!workers[truckId]) {
        return res.status(400).send({ message: 'Bu truck zaten durdurulmuş!' });
    }

    // Truck durduğunda veritabanına kaydetme
    const lastPosition = lastPositions[truckId];
    if (lastPosition) {
        const { latitude, longitude } = lastPosition;
        const timestamp = new Date().toISOString(); // Durduğunda anlık zaman

        // Veriyi veritabanına kaydetme
        const query = `
            INSERT OR REPLACE INTO truck_locations (truck_id, latitude, longitude, timestamp) 
            VALUES (?, ?, ?, ?)
        `;
        db.run(query, [truckId, latitude, longitude, timestamp], function(err) {
            if (err) {
                console.error('Veri kaydedilemedi:', err.message);
                return res.status(500).send({ message: 'Veri kaydedilemedi' });
            }

            // Başarıyla kaydedilen veriyi döndürüyoruz
            res.send({
                message: `Truck ${truckId} durduruldu ve verisi kaydedildi.`,
                timestamp: timestamp,  // Dönülen son timestamp
                latitude: latitude,    // Son latitude
                longitude: longitude   // Son longitude
            });
        });
    } else {
        res.status(400).send({ message: 'Veri bulunamadı!' });
    }
     // Truck'ı durdurdurulursa
    delete workers[truckId];
});

// Alarm verilerini gösterme
app.get('/alarms', (req, res) => {
    const query = 'SELECT * FROM truck_alarms';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Veritabanından alarm verisi alınamadı:', err.message);
            return res.status(500).send({ message: 'Veritabanından alarm verisi alınamadı' });
        }

        const alarms = rows.map(row => ({
            id: row.id,
            truckId: row.truck_id,
            latitude: row.latitude,
            longitude: row.longitude,
            timestamp: row.timestamp,
            message: row.message,
        }));

        res.send({ alarms });
    });
});
app.get('/inactive-trucks', (req, res) => {
    // Tüm araç verilerini alıyoruz
    const query = 'SELECT * FROM truck_locations';  
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Veritabanından veri alınamadı:', err.message);
            return res.status(500).send({ message: 'Veritabanından veri alınamadı' });
        }

        // Verileri pasif araçlar olarak düzenliyoruz
        const trucks = rows.map(row => ({
            truckId: row.truck_id,
            latitude: row.latitude,
            longitude: row.longitude,
            timestamp: row.timestamp,
        }));
// Pasif araçları frontend'e gönderiyoruz
        res.send({ trucks });  
    });
});

// Haritada tüm truck verilerini gösterme
app.get('/load-initial-data', (req, res) => {
    const query = 'SELECT * FROM truck_locations';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Veritabanından veri alınamadı:', err.message);
            return res.status(500).send({ message: 'Veritabanından veri alınamadı' });
        }

        const trucks = rows.map(row => ({
            truckId: row.truck_id,
            latitude: row.latitude,
            longitude: row.longitude,
            timestamp: row.timestamp,
        }));

        res.send({ trucks });
    });
});

// Aktif truck'ları listeleme
app.get('/active-trucks', (req, res) => {
    res.send({ activeTrucks: Object.keys(workers) });
});

// EventSource ile canlı veri akışı
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
        Object.keys(workers).forEach(truckId => {
            if (lastPositions[truckId]) {
                res.write(`data: ${JSON.stringify({
                    truckId,
                    ...lastPositions[truckId],
                })}\n\n`);
            }
        });
    }, 4000);

    req.on('close', () => clearInterval(interval));
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Veritabanı kapatılırken hata oluştu:', err.message);
        } else {
            console.log('Veritabanı kapatıldı.');
        }
        process.exit();
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
