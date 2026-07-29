<?php
$w = 800; $h = 600;
$source = imagecreatetruecolor($w, $h);
$white = imagecolorallocate($source, 255,255,255);
$red   = imagecolorallocate($source, 200,60,60);
$black = imagecolorallocate($source, 10,10,10);
imagefill($source, 0,0,$white);
imagefilledellipse($source, 400,300,300,300,$red);
imageellipse($source, 400,300,300,300,$black);

function avgBrightness(\GdImage $im): float {
    $w = imagesx($im); $h = imagesy($im);
    $sum = 0; $n = 0;
    for ($y=0; $y<$h; $y+=10) {
        for ($x=0; $x<$w; $x+=10) {
            $sum += (imagecolorat($im,$x,$y) & 0xFF);
            $n++;
        }
    }
    return $sum / $n;
}

function pctBelow(\GdImage $im, int $threshold): float {
    $w = imagesx($im); $h = imagesy($im);
    $below = 0; $n = 0;
    for ($y=0; $y<$h; $y+=5) {
        for ($x=0; $x<$w; $x+=5) {
            if ((imagecolorat($im,$x,$y) & 0xFF) < $threshold) $below++;
            $n++;
        }
    }
    return 100.0 * $below / $n;
}
$work = imagecreatetruecolor($w,$h);
imagecopyresampled($work, $source, 0,0,0,0,$w,$h,$w,$h);
echo "0. original avg brightness: " . avgBrightness($work) . "\n";

imagefilter($work, IMG_FILTER_GRAYSCALE);
echo "1. after grayscale: " . avgBrightness($work) . "\n";

imagefilter($work, IMG_FILTER_EDGEDETECT);
echo "2. after edgedetect: " . avgBrightness($work) . " | %below205=" . pctBelow($work,205) . "\n";

imagefilter($work, IMG_FILTER_NEGATE);
echo "3. after negate: " . avgBrightness($work) . " | %below205=" . pctBelow($work,205) . "\n";

imagefilter($work, IMG_FILTER_CONTRAST, -15);
echo "4. after contrast(-15): " . avgBrightness($work) . " | %below205=" . pctBelow($work,205) . "\n";

imagefilter($work, IMG_FILTER_SMOOTH, 3);
echo "5. after smooth(3): " . avgBrightness($work) . " | %below205=" . pctBelow($work,205) . "\n";

imagejpeg($work, __DIR__ . '/step5_work.jpg', 90);

$test = imagecreatetruecolor(100,100);
$c1 = imagecolorallocate($test,255,255,255);
imagefilledrectangle($test,0,0,50,100,$c1);
$c2 = imagecolorallocate($test,0,0,0);
imagefilledrectangle($test,50,0,100,100,$c2);
echo "\nContrast direction test:\n";
echo "before: white=" . (imagecolorat($test,10,10)&0xFF) . " black=" . (imagecolorat($test,60,10)&0xFF) . "\n";
imagefilter($test, IMG_FILTER_CONTRAST, -15);
echo "after contrast(-15): white=" . (imagecolorat($test,10,10)&0xFF) . " black=" . (imagecolorat($test,60,10)&0xFF) . "\n";
