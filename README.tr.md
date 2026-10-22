# md-table-fmt

Node.js (>=20, ESM) için sıfır bağımlılıklı, hızlı Markdown (GFM) tablo biçimlendirici, denetleyici (linter) ve dönüştürücü.

Belge içindeki Markdown tablolarını hizalar, bozuk satırları onarır ve kod bloklarını (``` ve ~~~) atlayarak tablonun dışındaki tüm içeriği bayt bayt korur. Doğu Asya geniş karakterleri (CJK), emoji gösterim dizileri, birleşen işaretler (combining diacritics), ülke bayrakları ve sıfır genişlikli karakterler için gelişmiş monospaced görüntüleme genişliği hesaplaması içerir.

## Özellikler

- Sıfır çalışma zamanı bağımlılığı: Tamamen yerleşik Node.js API'leri ve standart ECMAScript modülleri.
- Bozulmasız işlem: Tablo dışındaki metinleri, boş satırları, girintileri ve satır sonu formatlarını (LF/CRLF) bayt bayt korur.
- Çitle çevrili kod bloklarını atlama: Ters tırnak (```) ve tilde (~~~) blokları içindeki tablo benzeri metinlere dokunmaz.
- Unicode görüntü genişliği: UAX #11 East Asian Width, tam genişlikli karakterler, emoji dizileri, ten rengi değiştiricileri ve ZWJ aile dizilerini doğru ölçer.
- Kaçışlı dikey çizgiler ve satır içi kodlar: `\|` karakterlerini ve `` `kod | boru` `` bloklarını hücre ayırıcılarla karıştırmadan doğru ayrıştırır.
- Bozuk satır onarımı: Eksik sütunları doldurur, fazla sütun içeren satırları algılayarak tablo başlık ve ayraçlarını veri kaybını önleyecek şekilde hizalar.
- Çift yönlü veri dönüşümü: Markdown tabloları ile RFC 4180 uyumlu CSV, TSV ve JSON arasında dönüşüm sağlar.
- Sütun sıralama: Tablo satırlarını metin veya sayı bazında, artan ya da azalan sırada sıralar.
- Dahili denetleyici (linter): Uyumsuz sütun sayılarını, eksik başlık ayraçlarını, satır sonu boşluklarını ve hizasızlıkları raporlar.
- CI/CD uyumu: `fmt --check` komutu biçimlendirme gerekiyorsa çıkış kodu 1 ile sonlanır.

## Kurulum

```bash
# Genel (global) kurulum
npm install -g md-table-fmt

# npx ile doğrudan çalıştırma
npx md-table-fmt --help
```

## Komut Satırı (CLI) Kullanımı

Komut satırı aracı `md-table` adını taşır.

```text
Kullanım:
  md-table <komut> [seçenekler] [argümanlar]

Komutlar:
  fmt <dosyalar...> [--check]     Dosyalardaki veya standart girdideki Markdown tablolarını biçimlendirir
  lint <dosyalar...> [--strict]   Tabloları sütun uyuşmazlıkları ve eksik ayraçlar için denetler
  from-csv [dosya] [--tsv]        CSV/TSV verisini Markdown tablosuna dönüştürür
  to-csv [dosya] [--tsv]          Markdown tablosunu CSV/TSV formatına aktarır
  from-json [dosya]               JSON verisini Markdown tablosuna dönüştürür
  to-json [dosya]                 Markdown tablosunu JSON nesne dizisine dönüştürür
  sort [dosya] --by <sütun>       Tablo satırlarını sütun adına veya 1 tabanlı indekse göre sıralar

Seçenekler:
  -c, --check                  Dosyalara yazmadan biçimlendirme gerekip gerekmediğini denetler (değişiklikte çıkış 1)
  -b, --by <sütun>             Sıralama yapılacak sütun (başlık adı veya 1 tabanlı indeks)
  -d, --delimiter <karakter>   CSV ayırıcı karakteri (varsayılan: ,)
  -t, --tsv                    CSV işlemlerinde sekme (tab) ayırıcı kullanır
  -i, --in-place               Dosyayı yerinde günceller (sıralama komutu için)
  --desc                       Azalan sırada sıralar
  --numeric                    Sayısal sıralama yapar
  --table <indeks>             Hedeflenecek tablonun sıfır tabanlı indeksi (varsayılan: 0)
  --indent <n>                 JSON girinti boşluk sayısı (varsayılan: 2)
  --stdout                     Çıktıyı dosyaya yazmak yerine standart çıktıya iletir
  -h, --help                   Yardım iletisini gösterir
  -v, --version                Sürüm numarasını gösterir
```

### Örnekler

#### Dosyaları yerinde biçimlendirme

```bash
md-table fmt README.md docs/*.md
```

#### Sürekli Entegrasyonda (CI) kontrol

```bash
md-table fmt --check README.md docs/**/*.md
```

Biçimlendirilmesi gereken tablo varsa dosya yolu yazdırılır ve komut `1` çıkış kodu ile tamamlanır.

#### Tabloları denetleme (lint)

```bash
md-table lint docs/**/*.md
```

Aşağıdaki durumları tespit eder:
- Satırlar arasında tutarsız sütun sayıları
- Ayraç satırı (`|---|---|`) eksik olan başlıklar
- Tablo satırlarındaki gereksiz satır sonu boşlukları
- Hizalanmamış tablo hücreleri

#### CSV, TSV ve Markdown dönüşümleri

```bash
# CSV dosyasını Markdown tablosuna dönüştürme
md-table from-csv veri.csv > tablo.md

# TSV dosyasını Markdown tablosuna dönüştürme
md-table from-csv --tsv veri.tsv > tablo.md

# Markdown tablosunu CSV dosyasına aktarma
md-table to-csv tablo.md > veri.csv
```

#### JSON ve Markdown dönüşümleri

```bash
# JSON nesne dizisini Markdown tablosuna dönüştürme
md-table from-json liste.json > tablo.md

# Markdown tablosunu JSON dizisine aktarma
md-table to-json tablo.md > liste.json
```

#### Tablo satırlarını sıralama

```bash
# Başlık adına göre sıralama
md-table sort README.md --by "Maaş" --numeric --desc -i

# Sütun numarasına göre sıralama
md-table sort tablo.md --by 2
```

## Programatik API Kullanımı

`md-table-fmt` standart bir ESM kütüphanesi olarak da kullanılabilir:

```javascript
import {
  formatMarkdown,
  formatTable,
  lintMarkdown,
  stringWidth,
  csvToMarkdown,
  markdownToCsv,
  jsonToMarkdown,
  markdownToJson,
  sortMarkdown,
} from 'md-table-fmt';

// Belgedeki tabloları biçimlendirme (diğer metinler korunur)
const duzenlenmis = formatMarkdown(hamIcerik);

// Bağımsız tablo biçimlendirme
const tablo = formatTable(`
| İsim | Yaş |
|---|---|
| Ali | 30 |
| Ayşe | 25 |
`);

// Unicode monospaced genişlik hesaplama
console.log(stringWidth('İstanbul')); // 8
console.log(stringWidth('東京'));     // 4
console.log(stringWidth('🚀'));       // 2

// Tablo denetimi
const sorunlar = lintMarkdown(hamIcerik);

// CSV -> Markdown dönüşümü
const mdTablosu = csvToMarkdown('ad,puan\nAhmet,90\nMehmet,75');

// Tablo sıralama
const sirali = sortMarkdown(mdTablosu, { by: 'puan', desc: true, numeric: true });
```

## Mimari ve Unicode Yönetimi

GFM tabloları, sabit genişlikli yazı tiplerinde görüntülenmek üzere tasarlanmıştır. Yalnızca karakter sayımı (`string.length`) yapıldığında aşağıdaki durumlarda görsel hizalama bozulur:
1. Doğu Asya geniş ve tam genişlikli karakterleri (CJK) 2 sütun genişliği kaplar.
2. Birleşen diyakritik işaretler temel harfe eklenir ve imleci ilerletmez (genişlik 0).
3. Emoji dizileri, ten rengi varyantları, ülke bayrakları ve ZWJ dizileri çoklu kod noktasına rağmen tek bir görüntü kümesi (genişlik 2) oluşturur.

`md-table-fmt`, UAX #11 East Asian Width tabanlı oluşturulmuş ikili arama tablosu ve standart `Intl.Segmenter` kümeleme mekanizmasını birlikte kullanarak her hücre için kesin görsel genişliği hesaplar.

## Geliştirme

```bash
# Birim testleri çalıştırma
npm test

# Unicode genişlik tablosunu yeniden üretme
npm run generate-data
```

## Lisans

MIT Lisansı (c) 2026 Yusuf Berat Zengin. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakınız.
