# How to get the transaction logs for local analysis #
Given a particular reservation (i.e: XFWDN9KFGT) need to get the messages related to that resevation.

## Steps

1. Figure out when the reservation was created by getting its information.
   ```json
   curl --location '{{protocol}}://{{host}}:{{port}}/rest/v1/reservations/conf/{{reservationNumber}}?include=authorizations,invoices,payments,parties,products,segments,comments,authorizations,documents' \
   --header 'accept: application/json' \
   --header 'Content-Type: application/json' \
   --header 'Authorization: Bearer ****************'
   ```
2. Find creation date in response
   
   ```json
   {
       "reservation": {
           ...
           "creationDate": "2025-05-30T14:47:10.626+0000",
   ```
   Sometimes cancellation date is needed.
   ```json
   {
       "reservation": {
           ...
           "cancelDate": "2025-10-15T05:41:22.198+0000",
   ```
   
3. Delete local splunk logs
   ```bash
   rm -rf ~/Documents/splunk/bablefish/* && echo \"[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Deleted SPLUNK logs in bablefish folder\" ||    echo \"[$(date '+%Y-%m-%d %H:%M:%S')] 🛑 Failed to delete SPLUNK logs in bablefish folder\"
   ```
4. Get its bablefish transaction logs in local from splunk for the hour the reservation was created or deleted using the following command (Example on create date)
   ```bash
   gcloud storage cp -r --do-not-decompress gs://abvprp-logs-fluentd/logs/2025/05/30/14/trx.log/\*\* ~/Documents/splunk/   bablefish 
   ```
5. Reset local splunk
   ```bash
   /Applications/Splunk/bin/splunk stop ; 
   /Applications/Splunk/bin/splunk clean eventdata -f ;  
   /Applications/Splunk/bin/splunk start && echo \"[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Splunk started successfully\" || echo \"[$(date '   +%Y-%m-%d %H:%M:%S')] ⚠️ Failed to start Splunk\" 
   ```
6. Wait to finish to index and get logs for that reservation in Splunk UI
   - New Search -> `index="babelfish"  "XFWDN9KFGT"`
     ⚠️ Time Range: All Time

   - Also search for reservation request using the following strings depending on the channel: 
     - For Bonotel: `"bonotel/reservation"`
     - For APS: `"aps/v1/reservation"`
     - For CALL CENTER (native calls): `"rest/v1/reservation"`
7. Export from Splunk to a JSON file output to analize 