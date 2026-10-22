import json,urllib.request,urllib.parse,re,time,html
UA={"User-Agent":"TouchlineGameBot/1.0 (personal game data script; contact via github anassadaa)"}
def get(u,tries=5):
    for i in range(tries):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60))
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(5*(i+1)); continue
            raise
    raise Exception("429")
def api(**p):
    p.update(format="json",formatversion="2")
    return get("https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode(p))
S=open("club_titles.txt").read().strip()  # id:Wikipedia title|...
out={}
for item in S.split("|"):
    cid,t=item.split(":",1)
    try:
        secs=api(action="parse",page=t,prop="sections",redirects=1)["parse"]["sections"]
        idx=None
        for pat in [r"^(current |first[- ]team |senior )?squad$",r"^first[- ]team$",r"^current squad",r"squad",r"^players$"]:
            for s in secs:
                if re.search(pat,html.unescape(re.sub("<[^>]*>","",s["line"])).strip(),re.I) and not re.search("loan|youth|reserve|women|former|notable|academy|B team|under",s["line"],re.I):
                    idx=s["index"];break
            if idx: break
        if not idx: print(cid,"NOSEC");continue
        h=api(action="parse",page=t,prop="text",section=idx,redirects=1)["parse"]["text"]
    except Exception as e: print(cid,"ERR",e);continue
    rows=[]
    for tr in re.findall(r'<tr class="vcard agent">(.*?)</tr>',h,re.S):
        pos=re.search(r'<abbr title="[^"]*">(GK|DF|MF|FW)</abbr>',tr)
        nat=re.search(r'title="[^"]*">([A-Z]{3})</a></span>',tr)
        fn=re.search(r'<span class="fn">(.*?)</span>',tr,re.S)
        if not fn or not pos: continue
        a=re.search(r'<a href="/wiki/([^"#]*)"[^>]*>(.*?)</a>',fn.group(1))
        name=html.unescape(re.sub("<[^>]*>","",a.group(2) if a else fn.group(1))).strip()
        title=urllib.parse.unquote(a.group(1)).replace("_"," ") if a else ""
        rows.append([name,pos.group(1),nat.group(1) if nat else "",title])
    out[cid]=rows; print(cid,len(rows),flush=True); time.sleep(0.5)
json.dump(out,open("data/wp_squads.json","w"))
