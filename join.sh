OUTPUT="joined.csv"

cd reports/
first=1
for i in *.csv
do
  if [ $first -eq 1 ]
  then
    first=0
    cat $i >> $OUTPUT
  else
    tail -n+2 >> $OUTPUT
  fi
done


