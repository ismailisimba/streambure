const axios = require('axios');
const  parse  = require('htmlparser2');

class One337x {
    constructor() {
        this.url = 'https://1337x.to';
        this.supportedCategories = {
            'all': null,
            'anime': 'Anime',
            'software': 'Apps',
            'games': 'Games',
            'movies': 'Movies',
            'music': 'Music',
            'tv': 'TV',
        };
    }

    async search(what, cat = 'all') {
        const category = this.supportedCategories[cat];
        let page = 1;
        let inTorrentTable = undefined;
        const results = [];
        const torrents = [];
        let currentTorrent = {};
        let capturingData = false;
        let dataIndex = 0;

        while (true) {
            const pageUrl = category ?
                `${this.url}/category-search/${what}/${category}/${page}/` :
                `${this.url}/search/${what}/${page}/`;

            try {
                console.log("here?")
                const response = await axios.get(pageUrl);
                const html = response.data;
                const parser = new parse.Parser({
                    onopentag(name, attribs) {
                        if (name === "tr" && !attribs.class) {  // Torrent rows don't have a class attribute
                            capturingData = true;
                            currentTorrent = {};
                            dataIndex = 0;
                        } else if (capturingData && name === "a" && attribs.href && attribs.href.startsWith('/torrent/')) {
                            console.log("attrib",attribs)
                            const [_, torrentId, torrentHash] = attribs.href.split('/');
                            currentTorrent.link = `https://1337x.to${attribs.href}`;
                            currentTorrent.torrentHash = `https://1337x.to${attribs.href}`;
                        }
                    },
                    ontext(text) {
                        if (capturingData) {
                            text = text.trim();
                            if (text) {
                                dataIndex++;
                                switch (dataIndex) {
                                    case 1:
                                        currentTorrent.name = text;
                                        break;
                                    case 2:
                                        currentTorrent.seeds = text;
                                        break;
                                    case 3:
                                        currentTorrent.leeches = text;
                                        break;
                                    case 4:
                                        currentTorrent.comms = text;
                                        break;
                                    case 5:
                                        currentTorrent.size = text;
                                        break;
                                    case 6:
                                        currentTorrent.extra = text||null;
                                        break;
                                }
                            }
                        }
                    },
                    onclosetag(tagname) {
                        if (tagname === "tr" && capturingData) {
                            torrents.push(currentTorrent);
                            capturingData = false;
                        }
                    }
                }, { decodeEntities: true });
                console.log("heretoo??")
                parser.write(html);
                parser.end();
                console.log("dddy",torrents)
                
                if (html.includes('<li class="last">')){
                    return torrents;
                }
                page += 1;
                return torrents;
            } catch (error) {
                console.error(error);
                break;
            }
        }

        return results;
    }
}


module.exports = One337x;
