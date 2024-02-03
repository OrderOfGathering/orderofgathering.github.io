/*
 * Copyright (c) Alix von Schirp 2023.
 */

import { Octokit } from "https://esm.sh/octokit@2.0.0";


var emptyTab = '<li class="nav-item" role="presentation"><button class="nav-link" id="%tabname%" data-bs-toggle="tab" data-bs-target="#%id%" type="button" role="tab" aria-controls="%id%" aria-selected="true">%title%</button></li>'
var emptyContent = '<div class="tab-pane fade" id="%id%" role="tabpanel" aria-labelledby="%tabname%" tabindex="0"><div id="%id%_Content">%content%</div></div>'
var ids = [];
var tocs = [];

const octokit = new Octokit({
    userAgent: "OOG.ROG/v0.1.0",
});


async function getRulebook() {
    const {data} = await octokit.rest.repos.getContent({
        mediaType: {
            format: "raw",
        },
        owner: "OrderOfGathering",
        repo: "ROG",
        path: "Regelwerk.md",
    });

    let navTabs = document.getElementById("nav");
    let contentTabs = document.getElementById("content");
    let tableOfContents = document.getElementById("toc");
    let split = md.render(data).split("<hr>");
    for (let i = 0; i < split.length; i++) {
        let parser = new DOMParser();
        let dom = parser.parseFromString(split[i], "text/html");
        let h1 = dom.getElementsByTagName("h1")[0];
        let h1Split = h1.innerHTML.split("(");
        let title = h1Split[0];
        let id = h1Split[1].substring(0, h1Split[1].length - 1);
        let toc = buildToc(split[i]);

        navTabs.innerHTML += emptyTab.replace("%tabname%", id + "_" + i).replaceAll("%title%", title).replaceAll("%id%", id);
        contentTabs.innerHTML += emptyContent.replace("%tabname%", id + "_" + 1).replaceAll("%id%", id).replaceAll("%content%", divify(toc['content'], 0, 2, 6));
        tocs[id] = (toc['toc']);
    }

    navTabs.getElementsByClassName("nav-link")[0].classList.add("active");
    contentTabs.getElementsByClassName("tab-pane")[0].classList.add("active");
    contentTabs.getElementsByClassName("tab-pane")[0].classList.add("show");
    tableOfContents.innerHTML=tocs[navTabs.getElementsByClassName("active")[0].getAttribute("aria-controls")];
}

function buildToc(content) {
    var toc = "";
    var level = 1;


    content = content.replace(/<h([2-9])>([^<]+)<\/h([2-9])>/gi,
            function (str, openLevel, titleText, closeLevel) {
                if (openLevel != closeLevel) {
                    return str;
                }

                if (openLevel > level) {
                    toc += (new Array(openLevel - level + 1)).join("<ul>");
                } else if (openLevel < level) {
                    toc += (new Array(level - openLevel + 1)).join("</ul>");
                }

                level = parseInt(openLevel);

                let anchor = getAnchor(titleText);
                toc += "<li class=\"nav-item\"><a href=\"#" + anchor + "\" class=\"nav-link text-truncate\">" + titleText
                    + "</a></li>";
                let newHeading = '<h' + openLevel + ' id=' + anchor + '><a>'
                    + titleText + '</a></h' + closeLevel + '>';
                return newHeading;
            }
        );

    if (level) {
        toc += (new Array(level + 1)).join("</ul>");
    }


    return {toc, content}
}

function getAnchor(anchor){
    anchor = anchor.replaceAll(/ /g, "_");
    if(ids.includes(anchor)){
        if(anchor.match(/.*\d+$/gm)){
            anchor = anchor.replace(/(\d+)$/gm, function(x){return (parseInt(x) ? parseInt(x)+1 : x)})
        } else {
            anchor+="1";
        }
        return getAnchor(anchor);
    }
    ids.push(anchor);
    return anchor;
}

function divify(content, level, next, limit){
    if(level===limit) {
        return content;
    }
    else if(level===0) {
        return divify(
            content.replaceAll(/<h[2-9]/g, function (x) {
                return x.replace("<h", "<hr") + '/>' + x
            }),
            next, next + 1, limit);
    }
    else {
        let split = content.split('<hr'+level+'/>');
        let newContent = "";
        for (let i = 0; i < split.length; i++){
            if(i ===0 ) {
                newContent += split[i];
                continue;
            }
            split[i]=divify(split[i],next, next+1, limit);;
            let parser=new DOMParser();
            let dom = parser.parseFromString('<div class="pb-2" id="temp">' + split[i] + '</div>', "text/html");
            let id = dom.getElementById('temp').getElementsByTagName("h"+level)[0].id;
            dom.getElementById('temp').getElementsByTagName("h"+level)[0].removeAttribute("id");
            dom.getElementById('temp').id=id;
            newContent+=dom.getElementById(id).outerHTML;
        }
        return newContent;
    }

}

var md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true
});

getRulebook().then();

document.addEventListener("show.bs.tab", (event) => {
    let id = event.target.getAttribute("aria-controls");

    let tableOfContents = document.getElementById("toc");
    tableOfContents.innerHTML=tocs[id];
})

window.addEventListener("hashchange", () => document.getElementById("tocclose").click());