First things first: DEPLOYMENT.md should answer all the deployment related questions.

Apologies for dumping the thoughts in this manner. (Ran heavily into Time Constraint and did not feel like I should extend it any more)

The assignment targets two things which I felt were required to be addressed.
1. How to replace loading of CSV's with better strategy?
What is better than an actual database, I observed that the database which we had to choose had to be something which can handle timeseries data and hence, I researched on possible options for the same. The best option which I felt was Postgres + Timescaledb extension.
The whole reading from csv and somehow managing the most recent stuff, didn't really add up. We could do some simple stuff like keeping a map of keys and values for the buckets that we want to query and then we would need to run some jobs to make sure that map is updated, I meant with native datastructures it is possible to achieve such things, but it just didn't feel intuitive and database is always better. I would not want to do the optimisations already done and building from scratch if I have the liberty of choice.
Why this choice?
I have worked with Postgres and I understand how to set up and work with it, additionally, I had to work with TypeScript which meant I need some familiarity with atleast one technology. Hence, postgres was an automatic choice. Later, I saw the usefulness of Timescaledb as it was not too tough to use. My initial approach was to use views directly after ingesting the csv. Timescaledb comes up with some better features which honestly I had used AI for research and then ran a small scale experiment with limited data to see how these views are made and what is the syntax for the same. The syntax was not overly complex and I honestly, knew that once we are just able to do this much, the query times would reduce well within the limit.
2. What are some other choices which I had to do was how I am going to deploy this?
My go to option for deployment has always been Docker and hence I started with docker compose, midway I realised that, I don't have the actual features ready and node js deployment was honestly bit confusing, I wanted to multistage dockers as I had done them previously and they are pretty light weight which is perfect for deployment. However, thats where I felt I put in a lot of time, to come up with proper deployment strategy and still not able to build the docker files in an appropriate manner.

Hence, the only option was to concentrate back on the features and if time permits, I will spend some time using Claude and some things that I know to work with it.

Next, comes the part where Ratelimit needs to be handled. I had previously implemented something similar for my previous project but it was using Kong to do it. I know that Kong could have been a good choice but then, I felt for the assignment it was not appropriate to rest the logic to Kong and then again focus on integrating it. Hence, comes Redis into picture. It is very well known easily done strategy to do a sliding window with Redis as rate limiter. Now, why redis because we don't have to handle expiry of the keys which is the base constraint of ratelimiter. Well, to be honest, I did use some internet resources and AI to complete this part. Next, since we already had redis, we could cache almost every api we had to make sure we are not stressing the DB, the views for aggregations, etc. 

For building the analytics api, what felt intuitive was we have a diagram or chart and then there are options to select what data we want to view. This was the basic thought process behind designing the main analytics api which can do aggregations for 1 min, 5 min, 15min
and querying it is pretty simple with the views that we have. Well, if one might say, most of the heavy lifting for the task was done by our database choice and most of the stuff which we had left to do was integrating it. 

AI Usage:
I would definitely say, I used a lot of Claude Code (first time experience) and it was pretty good. My biggest fear was whether I could do everything properly in typescript or not and that was quite beautifully handled by it. Learnt a lot of typescript in the process.
I would even say, I have not written a single line of code on frontend for chart visualisation, simply because I did not know and having just an idea how things work sailed me through, like where should we put hooks and how they are to be used alongwith other stuff.

Import Script:
Tried doing lot of other ways like directly copying into table etc, but felt that from a bit of python background, its just better to write something which I can see and track in the correct manner. Its a pretty simple script where we read and injest the data in appropriate tables.

Tables:
Indexing the tables was the only thing which required a bit of care but it was pretty straightforward to do it. The only other factor was choosing good table names and columns and somewhere in the codebase I found some good column names to say the least. Indexing on ids for fast retrieval, and as discussed above materialistic views with timescale continous aggregates was pretty simple to configure. (Thanks to AI)

I think we have covered most of the parts of the assignment so lets talk about shortcomings:
1. The biggest short coming is not able to isolate and deploy the whole stuff using say the least docker containers. I think it was one of the biggest shortcoming for me and also a learning lesson that not everything is as simple in building good optimised docker images as python :)
2. Not having time to solve the ML problem. Although, I did give a thought on it and how I would have probably approached it. I was thinking to use boosting algorithms (XGBoost) probably, and then doing some small optimisation for the heavily imbalanced data by biasing towards imabalanced classes. Although, this was the top of the view thought and I still need to think a bit more whether synthetic data generation or something of that sort would work better or not.
3. Unit tests would have been great to write and would have definitely used AI for it. But, writing them is important because it helps in the overall CI/CD pipeline making sure that all the code we push is having backward compatibility and if its a significant change, we can document it.
4. Not managing variables in centralised manner for redis caching and some other constant variables.

Lastly, apologies for this dump of thoughts, instead of proper techincal drafted document. However, I hope this did cover all the major points

Also, on performance measurements I think we do have sub 100ms response times now, although I would not be pretty happy right now about it because in a production environment, the views that we generate and the data ingestion that would happen would be quite large and the only way we can be sure that this POC would work is to deploy in actual environment. I think the generation of materialised views will take some time based on the data size it has to index but it should work quite decently.

Please let me know if anyone runs into issues while trying this out. Refer DEPLOYMENT.md for more details.
