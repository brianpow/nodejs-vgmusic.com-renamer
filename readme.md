# vgmusic.com Renamer

## Introduction
Since the filename of midi files in vgmusic.com is quite messy, here is a little script to rename the midi files. It creates symbolic link in target path to save space and let you update your collection using wget.

## Example
First you have to download the midi files

`wget -m http://www.vgmusic.com/music/console/nintendo/`

Then you can run renamer to create symbolic links in the path you like

`node renamer.js www.vgmusic.com/music /media/midi`

## Known Issues
My box does not support newer version of nodejs because of missing FPU, so the code is a bit ugly (e.g. I can't use `let`, `for..of` etc) in order to run under nodejs v0.12.7.

vgmusic.com has stored some files with the same name but in different cases, since Windows' filesysem is NOT case-sensitive, you can never have a complete mirror if downloading using wget under Windows.