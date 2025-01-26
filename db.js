const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosyasını oluştur
const dbPath = path.resolve(__dirname, 'truck_locations.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Veritabanı bağlantısı sağlanamadı:', err.message);
    } else {
        console.log('Veritabanı bağlantısı sağlandı.');
    }
});

// Veritabanında tabloları oluştur
db.serialize(() => {
    // Araç konumları tablosu
    db.run(`
        CREATE TABLE IF NOT EXISTS truck_locations (
            truck_id TEXT PRIMARY KEY,
            latitude REAL,
            longitude REAL,
            timestamp TEXT
        )
    `, (err) => {
        if (err) {
            console.error('truck_locations tablosu oluşturulurken hata oluştu:', err.message);
        } else {
            console.log('truck_locations tablosu oluşturuldu.');
        }
    });

    // Alarmlar tablosu
    db.run(`
        CREATE TABLE IF NOT EXISTS truck_alarms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            truck_id TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TEXT NOT NULL,
            message TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('truck_alarms tablosu oluşturulurken hata oluştu:', err.message);
        } else {
            console.log('truck_alarms tablosu oluşturuldu.');
        }
    });
});

// modülü export ediyoruz ki başka sayfalardan erişebilelim
module.exports = db;
