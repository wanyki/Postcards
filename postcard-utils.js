const PostcardUtils = {
    API_BASE: window.location.origin,
    
    countryMap: null,
    
    async loadCountryMap() {
        if (this.countryMap) return this.countryMap;
        try {
            const resp = await fetch('countryMap.json');
            this.countryMap = await resp.json();
            return this.countryMap;
        } catch (e) {
            console.error('Failed to load countryMap:', e);
            return {};
        }
    },
    
    getReverseCountryMap(countryMap) {
        const rev = {};
        for (let key in countryMap) {
            rev[countryMap[key]] = key;
        }
        return rev;
    },
    
    normalizePostcard(item) {
        let tags = item.tags;
        if (typeof tags === 'string') {
            tags = tags.replace(/[\[\]"]/g, '').split(',').filter(t => t.trim() !== '');
        } else if (!tags) {
            tags = [];
        }
        
        return {
            ...item,
            id: item.id,
            type: item.type,
            country: item.country,
            region: item.region,
            note: item.note,
            tags: tags,
            imgFront: item.imgFront || item.imgfront || item.image_path,
            sendDate: item.sendDate || item.senddate || item.send_date,
            receiveDate: item.receiveDate || item.receivedate || item.receive_date,
            person: item.person,
            platform: item.platform
        };
    },
    
    async fetchPostcards() {
        const response = await fetch(`${this.API_BASE}/api/postcards`);
        const { data, error } = await response.json();
        if (error) throw new Error(error);
        return data.map(item => this.normalizePostcard(item));
    },
    
    getRegionKey(card, mapType, countryMap) {
        if (mapType === 'china') {
            if (!card.country || card.country === '中国') {
                if (card.region) {
                    let key = card.region.substring(0, 2);
                    if (key === '内蒙') return '内蒙古';
                    if (key === '黑龙') return '黑龙江';
                    return key;
                }
            }
        } else {
            let country = card.country || '中国';
            return countryMap[country] || country;
        }
        return null;
    },
    
    extractProvince(region) {
        if (!region) return '';
        let n = region.substring(0, 2);
        if (n === '内蒙') return '内蒙古';
        if (n === '黑龙') return '黑龙江';
        return n;
    },
    
    getDuration(card) {
        if (!card.receiveDate || !card.sendDate) return null;
        const start = new Date(card.sendDate);
        const end = new Date(card.receiveDate);
        const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        return diff >= 0 ? diff : 0;
    },
    
    formatDate(date) {
        if (!date) return null;
        if (typeof date === 'string') return date.split('T')[0];
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};
