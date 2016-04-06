zip -r app.nw *
mv app.nw ../roadsurvey_v1.0_linux_64
cd ../roadsurvey_v1.0_linux_64
pwd
sed -i 's/udev\.so\.0/udev.so.1/g' nw
cat ./nw ./app.nw > app && chmod +x app
