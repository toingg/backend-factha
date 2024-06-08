# This is code for uploading into bucket using filepath of the image
## The code running well in local environment, but error in the container environment when deployed


_Kode error ketika dideploy di container menggunakan cloud run. Error  tidak bisa upload ke gcs bucketnya.
Error terlihat di logs docker container local dan cloud run logs (lebih mudah dilihat di docker container local). Error karena container tidak bisa melihat path yang berasal dari luar / user.
Gagal mengupload C:/Users/Toing/Pictures/untag.jpg: ENOENT: no such file or directory, open 'C:/Users/Toing/Pictures/untag.jpg'_

_Karena tidak ada path dan file tersebut di container itu._

