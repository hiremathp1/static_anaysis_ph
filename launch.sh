# Number of lines to split by
SPLIT_BY=100
FILENAME=crawler.txt
INSTANCES=1

# Cleanup
rm -rf links/*
rm -rf reports/*

function scrapeloop {
  echo "Scraping at $1"
  cd ..
  for i in links/$1/*
  do
    npm start $i
  done
}

cd links
echo "Preparing Instances..."
split -l $(expr $(wc -l < "../$FILENAME") / $INSTANCES) ../$FILENAME crawler_
echo "Splitting files..."
for i in *
do
  mkdir "INS_$i"
  cd "INS_$i"
  split -l $SPLIT_BY ../$i crawler_
  cd ..
  rm $i
  scrapeloop "INS_$i" &
done
trap 'kill $(jobs -p)' EXIT

while true
do
  sleep 1
done

