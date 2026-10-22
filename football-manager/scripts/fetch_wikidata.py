import json,urllib.request,urllib.parse,time
UA={"User-Agent":"TouchlineGameBot/1.0 (personal game data script)"}
def get(u):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90))
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(5*(i+1)); continue
            raise
sq=json.load(open("data/wp_squads.json"))
titles=sorted({r[3] for v in sq.values() for r in v if r[3]})
qid={}
for i in range(0,len(titles),50):
    b=titles[i:i+50]
    r=get("https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode(dict(action="query",prop="pageprops",ppprop="wikibase_item",redirects=1,titles="|".join(b),format="json",formatversion="2")))
    norm={x["from"]:x["to"] for x in r["query"].get("normalized",[])+r["query"].get("redirects",[])}
    m={p["title"]:p.get("pageprops",{}).get("wikibase_item") for p in r["query"]["pages"]}
    for t in b:
        tt=norm.get(t,t); tt=norm.get(tt,tt)
        if m.get(tt): qid[t]=m[tt]
print(len(titles),len(qid))
ids=sorted(set(qid.values())); info={}
for i in range(0,len(ids),50):
    r=get("https://www.wikidata.org/w/api.php?"+urllib.parse.urlencode(dict(action="wbgetentities",ids="|".join(ids[i:i+50]),props="claims|sitelinks",format="json")))
    for k,e in r["entities"].items():
        dob=None
        try: dob=e["claims"]["P569"][0]["mainsnak"]["datavalue"]["value"]["time"][1:5]
        except Exception: pass
        info[k]=[dob,len(e.get("sitelinks",{}))]
    time.sleep(0.3)
json.dump({t:info.get(q) for t,q in qid.items()},open("data/wd_info.json","w"))
print(len(info))
