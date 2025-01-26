const { Kafka } = require('kafkajs');
const db = require('./db');  

// Kafka bağlantısı
const kafka = new Kafka({
    clientId: 'alarm-producer',
    brokers: ['localhost:9092'],
});

const topic = 'alarms';
const producer = kafka.producer();

// Eşik değerleri
const thresholds = {
    tirePressure: { min: 37, max: 38 }, // lastik basıncı 
    brakeDiskTemperature: { min: 190, max: 200 }, // Fren diski sıcaklık 
    brakeFluidLevel: { min: 0.9, max: 1.0 }, // Fren hidroliği seviyesi
    doorStatus: { closed: 1 }, // Kapı durumu (1: Kapalı, 0: Açık)
};

// Rastgele veri üretme fonksiyonu 
function generateRandomData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                tirePressure: Math.random() * 10 + 28, 
                brakeDiskTemperature: Math.random() * 200, 
                brakeFluidLevel: Math.random(), 
                doorStatus: Math.random() > 0.85 ? 1 : 0, 
            });
            //10 saniye gecikme değeri
        }, 10000);
    });
}

// Alarm üretme fonksiyonu
let lastAlarmTimestamp = {}; // Son alarm zamanını tutan bir nesne

function checkAlarmConditions(truckId, latitude, longitude, lastPositions) {
    // lastPositions içinde truckId'ye karşılık gelen bir konum var mı kontrol et
    if (!lastPositions || !lastPositions[truckId]) {
        console.log(`Truck ${truckId} için konum verisi bulunamadı.`);
        return; // Eğer veriler yoksa işlemi sonlandır
    }

    const position = lastPositions[truckId];

    // Alarm koşulları kontrolü (örnek)
    generateRandomData().then((data) => {  // Rastgele alarm verisi üret

        Object.keys(thresholds).forEach((key) => {
            // Alarm türünün eşik değerini kontrol et
            const now = Date.now();
            const threshold = thresholds[key];

            // Sadece eşik değeri aşan veriyi kontrol et
            if (
                (key === 'doorStatus' && data[key] !== threshold.closed) ||
                (key !== 'doorStatus' && (data[key] < threshold.min || data[key] > threshold.max))
            ) {
                if (!lastAlarmTimestamp[key] || now - lastAlarmTimestamp[key] > 10000) {  // 10 saniyede bir alarm gönder
                    sendAlarm(truckId, position.latitude, position.longitude, `${key} alarmı: Değer dışı!`);
                    lastAlarmTimestamp[key] = now;  // Alarm zamanını güncelle
                }
            }
        });
    });
}

// Alarmı Kafka'ya gönderme fonksiyonu
async function sendAlarm(truckId, latitude, longitude, message) {
    await producer.connect();

    const alarm = {
        truckId,
        latitude,
        longitude,
        message,
        timestamp: new Date().toISOString(),
    };

    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(alarm) }],
    });

    // Alarmı veritabanına kaydetme
    const query = `
        INSERT INTO truck_alarms (truck_id, latitude, longitude, message, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.run(query, [truckId, latitude, longitude, message, alarm.timestamp], (err) => {
        if (err) {
            console.error('Alarm kaydedilemedi:', err.message);
        }
    });
}

// Alarm kontrolünü başlatma
function startAlarmProducer(truckId, lastPositions) {
    if (!lastPositions || !lastPositions[truckId]) {
        console.log(`Truck ${truckId} verisi mevcut değil, alarm üretilemiyor.`);
        return; // Eğer truckId verisi eksikse işlemi sonlandır
    }

    setInterval(() => {
        // lastPositions içinde truckId'yi kontrol ederek alarm üret
        checkAlarmConditions(truckId, lastPositions[truckId].latitude, lastPositions[truckId].longitude, lastPositions);
    }, 30000);
}

module.exports = { startAlarmProducer, checkAlarmConditions };
