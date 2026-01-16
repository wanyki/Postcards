if (document.getElementById('app')) {
    new Vue({
        el: '#app',
        data: {
            filterProvince: '', filterCity: '', filterType: '', filterId: '', filterPlatform: '', filterTag: '',
            sortBy: 'id_desc',
            postcards: typeof postcardData !== 'undefined' ? postcardData : [],
            myChart: null,
            displayCount: 12, 
            mapType: 'china',
            countryMap: { "中国": "China", "日本": "Japan", "美国": "United States", "德国": "Germany", "英国": "United Kingdom", "法国": "France", "韩国": "Korea", "俄罗斯": "Russia" }
        },
        computed: {
            stats() {
                const receive = this.postcards.filter(c => c.type === '收到').length;
                const countries = new Set(this.postcards.map(c => c.country || '中国')).size;
                return { receiveCount: receive, sendCount: this.postcards.length - receive, countryCount: countries };
            },
            provinces() {
                const ps = this.postcards.filter(c => !c.country || c.country === '中国').map(c => {
                    let n = c.region.substring(0, 2);
                    if (n === '内蒙') return '内蒙古';
                    if (n === '黑龙') return '黑龙江';
                    return n;
                });
                return [...new Set(ps)].sort();
            },
            availableCities() {
                if (!this.filterProvince || typeof chinaData === 'undefined') return [];
                return chinaData[this.filterProvince] || [];
            },
            platforms() {
                return [...new Set(this.postcards.map(c => c.platform).filter(p => p))];
            },
            allResults() {
                const kwTag = (this.filterTag || '').toLowerCase();
                const kwId = (this.filterId || '').toLowerCase();
                let results = this.postcards.filter(c => {
                    const mProv = !this.filterProvince || c.region.includes(this.filterProvince);
                    const mCity = !this.filterCity || c.region.includes(this.filterCity);
                    const mType = !this.filterType || c.type === this.filterType;
                    const mPlat = !this.filterPlatform || c.platform === this.filterPlatform;
                    const mId = !kwId || c.id.toLowerCase().includes(kwId);
                    const tags = Array.isArray(c.tags) ? c.tags.join(',') : '';
                    const mTag = !kwTag || tags.toLowerCase().includes(kwTag) || (c.note && c.note.toLowerCase().includes(kwTag)) || c.region.includes(kwTag);
                    return mProv && mCity && mType && mPlat && mId && mTag;
                });
                results.sort((a, b) => {
                    if (this.sortBy === 'id_desc') return b.id.localeCompare(a.id, undefined, {numeric: true});
                    if (this.sortBy === 'id_asc') return a.id.localeCompare(b.id, undefined, {numeric: true});
                    if (this.sortBy === 'date_desc') return (b.receiveDate || b.sendDate || '').localeCompare(a.receiveDate || a.sendDate || '');
                    return 0;
                });
                return results;
            },
            displayCards() { return this.allResults.slice(0, this.displayCount); },
            totalFilteredCount() { return this.allResults.length; }
        },
        watch: {
            allResults() { this.displayCount = 12; this.updateMap(); }
        },
        mounted() {
            this.initMap();
            window.addEventListener('resize', () => this.myChart && this.myChart.resize());
        },
        methods: {
            toggleMap(type) { this.mapType = type; this.updateMap(); },
            resetAll() {
                this.filterProvince = ''; this.filterCity = ''; this.filterType = '';
                this.filterId = ''; this.filterPlatform = ''; this.filterTag = '';
                this.sortBy = 'id_desc'; this.displayCount = 12;
            },
            initMap() {
                const dom = document.getElementById('map-container');
                if (!dom) return;
                this.myChart = echarts.init(dom);
                this.myChart.on('click', (p) => { if (this.mapType === 'china') this.filterProvince = p.name; });
                this.updateMap();
            },
            updateMap() {
                if (!this.myChart) return;
                const stats = {};
                this.postcards.forEach(c => {
                    let key = "";
                    if (this.mapType === 'china') {
                        if (!c.country || c.country === '中国') {
                            key = c.region.substring(0, 2);
                            if (key === '内蒙') key = '内蒙古';
                            if (key === '黑龙') key = '黑龙江';
                        }
                    } else {
                        let country = c.country || "中国";
                        key = this.countryMap[country] || country;
                    }
                    if (key) {
                        if (!stats[key]) stats[key] = { total: 0, send: 0, receive: 0 };
                        stats[key].total++;
                        c.type === '收到' ? stats[key].receive++ : stats[key].send++;
                    }
                });
                const mapData = Object.keys(stats).map(k => ({ name: k, value: stats[k].total, send: stats[k].send, receive: stats[k].receive }));
                this.myChart.setOption({
                    tooltip: { trigger: 'item', formatter: (p) => p.data ? `<b>${p.name}</b><br/>总数: ${p.data.value}<br/>📥 收到: ${p.data.receive}<br/>📤 寄出: ${p.data.send}` : `${p.name}: 0` },
                    visualMap: { min: 0, max: Math.max(...mapData.map(d=>d.value), 5), left: 'left', inRange: { color: ['#e0f3f8', '#4361ee'] }, calculable: true },
                    series: [{ type: 'map', mapType: this.mapType, data: mapData, roam: true, label: { show: this.mapType === 'china', fontSize: 10 }, itemStyle: { borderColor: '#fff' } }]
                }, true);
            }
        }
    });
}