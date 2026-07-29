# Server Installation Instructions

## 📋 Overview
This document provides step-by-step instructions for installing the required packages and deploying the Arabic text rendering and line art quality fixes to your server.

## 🚀 Installation Steps

### 1. Connect to Server
```bash
ssh root@srv1817907
cd /var/www/ai-sass/backend
```

### 2. Install Required PHP Extensions
```bash
# Install GD extension (usually already installed)
apt install -y php-gd

# Install mbstring extension (usually already installed)
apt install -y php-mbstring

# Install Imagick extension (optional, for better image processing)
apt install -y php-imagick
```

### 3. Install Composer Packages
```bash
cd /var/www/ai-sass/backend
composer require baidouabdellah/laravel-arpdf
composer require intervention/image
```

### 4. Publish ArPDF Configuration
```bash
php artisan vendor:publish --provider="Baidouabdellah\ArPDF\ArPDFServiceProvider"
```

### 5. Clear Configuration Cache
```bash
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

### 6. Install Arabic Fonts (Optional but Recommended)
```bash
# Install Noto fonts (includes Arabic fonts)
apt install -y fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji fonts-noto-extra

# Or manually download Arabic fonts
mkdir -p /usr/share/fonts/truetype/noto
cd /usr/share/fonts/truetype/noto
wget https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf
wget https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf
fc-cache -fv
```

### 7. Update Environment Variables (Optional)
```bash
nano /var/www/ai-sass/backend/.env
```

Add these lines if not present:
```env
ARPDF_ENGINE=mpdf
ARPDF_DIRECTION=ltr
ARPDF_DEFAULT_FONT=DejaVu Sans
ARPDF_PAPER_FORMAT=A4
ARPDF_ORIENTATION=portrait
```

### 8. Restart Queue Worker
```bash
systemctl restart storyhero-worker
systemctl status storyhero-worker
```

### 9. Test the Installation
```bash
# Test ArPDF installation
php artisan tinker
>>> use Baidouabdellah\ArPDF\Facades\ArPDF;
>>> ArPDF::direction('rtl')->title('Test')->view('pdf.storybook-cover', ['title' => 'Test', 'childName' => null, 'imageUrl' => null, 'rtl' => true, 'language' => 'ar', 'font' => 'Cairo'])->output();
```

### 10. Monitor Queue Processing
```bash
journalctl -u storyhero-worker -f
```

## 🔧 Troubleshooting

### Package Installation Issues
If composer fails, try:
```bash
composer update
composer require baidouabdellah/laravel-arpdf
composer require intervention/image
```

### Font Issues
If Arabic fonts don't work:
```bash
# Check available fonts
fc-list | grep -i arabic

# Update font cache
fc-cache -fv
```

### Permission Issues
```bash
# Ensure proper permissions
chown -R www-data:www-data /var/www/ai-sass/backend/storage
chmod -R 775 /var/www/ai-sass/backend/storage
```

### Memory Issues
If jobs fail due to memory:
```bash
# Increase PHP memory limit in php.ini
memory_limit = 512M
```

## 📊 Expected Results

After installation:
- ✅ Arabic text should render correctly in PDFs
- ✅ English text should render correctly
- ✅ Coloring book line art should be clean and professional
- ✅ No more garbled text or poor quality line art

## 🎯 Testing

### Test Arabic Story
1. Create a new story with Arabic language
2. Generate story book
3. Download and check PDF for Arabic text rendering

### Test English Story
1. Create a new story with English language
2. Generate story book
3. Download and check PDF for English text rendering

### Test Coloring Book
1. Generate coloring book for any story
2. Download and check line art quality
3. Should be clean black lines on white background

## 🔄 Rollback Plan

If issues occur:
```bash
# Rollback composer changes
composer remove baidouabdellah/laravel-arpdf
composer remove intervention/image

# Restore original code
git checkout HEAD~1 -- composer.json
git checkout HEAD~1 -- app/Services/StoryProductService.php
git checkout HEAD~1 -- config/arpdf.php
git checkout HEAD~1 -- resources/views/pdf/

# Clear cache
php artisan config:clear
php artisan cache:clear

# Restart services
systemctl restart storyhero-worker
```

## 📞 Support

If you encounter any issues:
1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Check queue worker logs: `journalctl -u storyhero-worker -f`
3. Verify PHP extensions: `php -m | grep -E "gd|imagick|mbstring"`
4. Check composer packages: `composer show`

## ✅ Installation Complete

Once all steps are completed, your system should be ready for:
- Professional Arabic text rendering
- Perfect English text rendering
- High-quality coloring book line art
- Zero API costs
- Fast, reliable processing
