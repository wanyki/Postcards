if (document.getElementById('app')) {
    // 将实例赋值给 window.vm，方便 index.html 的 fetch 脚本与之通信
    window.vm = new Vue({
        el: '#app',
        data: {
            filterCountry: '', filterProvince: '', filterCity: '', filterType: '', 
            filterId: '', filterPlatform: '', filterTag: '',
            sortBy: 'id_desc',
            // 初始设为空数组，等待接口填充
            postcards: [], 
            myChart: null,
            displayCount: 12, 
            mapType: 'china',
            countryMap: { 
                "中国": "China", "日本": "Japan", "美国": "United States", 
                "德国": "Germany", "英国": "United Kingdom", "法国": "France", 
                "韩国": "Korea", "俄罗斯": "Russia", "加拿大": "Canada", "澳大利亚": "Australia"
            }
        },
        computed: {
            reverseCountryMap() {
                const rev = {};
                for (let key in this.countryMap) {
                    rev[this.countryMap[key]] = key;
                }
                return rev;
            },
            stats() {
                // 增加防御性编程，防止 postcards 为空时报错
                if (!this.postcards.length) return { receiveCount: 0, sendCount: 0, countryCount: 0 };
                const receive = this.postcards.filter(c => c.type === '收到').length;
                const countries = new Set(this.postcards.map(c => c.country || '中国')).size;
                return { 
                    receiveCount: receive, 
                    sendCount: this.postcards.length - receive, 
                    countryCount: countries 
                };
            },
            countries() {
                const cs = this.postcards.map(c => c.country || '中国');
                return [...new Set(cs)].sort();
            },
            provinces() {
                const ps = this.postcards
                    .filter(c => !c.country || c.country === '中国')
                    .map(c => {
                        if (!c.region) return '';
                        let n = c.region.substring(0, 2);
                        if (n === '内蒙') return '内蒙古';
                        if (n === '黑龙') return '黑龙江';
                        return n;
                    }).filter(it => it);
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
                
                let results = [...this.postcards]; // 使用拷贝防止污染原数据

                results = results.filter(c => {
                    const cardCountry = c.country || '中国';
                    const mCountry = !this.filterCountry || cardCountry === this.filterCountry;
                    let mProv = true;
                    let mCity = true;
                    if (cardCountry === '中国') {
                        mProv = !this.filterProvince || (c.region && c.region.includes(this.filterProvince));
                        mCity = !this.filterCity || (c.region && c.region.includes(this.filterCity));
                    }
                    const mType = !this.filterType || c.type === this.filterType;
                    const mPlat = !this.filterPlatform || c.platform === this.filterPlatform;
                    const mId = !kwId || c.id.toLowerCase().includes(kwId);
                    
                    const tags = Array.isArray(c.tags) ? c.tags.join(',') : '';
                    const searchPool = [tags, c.note || '', c.region || '', cardCountry, c.person || ''].join('|').toLowerCase();
                    const mTag = !kwTag || searchPool.includes(kwTag);

                    return mCountry && mProv && mCity && mType && mPlat && mId && mTag;
                });

                results.sort((a, b) => {
                    const dateA = new Date(a.receiveDate || a.sendDate || 0);
                    const dateB = new Date(b.receiveDate || b.sendDate || 0);
                    const getDuration = (card) => {
                        if (!card.receiveDate || !card.sendDate) return 0;
                        const diff = Math.floor((new Date(card.receiveDate) - new Date(card.sendDate)) / (1000 * 60 * 60 * 24));
                        return diff >= 0 ? diff : 0;
                    };

                    switch (this.sortBy) {
                        case 'id_desc': return b.id.localeCompare(a.id, undefined, {numeric: true});
                        case 'id_asc':  return a.id.localeCompare(b.id, undefined, {numeric: true});
                        case 'date_desc': return dateB - dateA;
                        case 'date_asc':  return dateA - dateB;
                        case 'duration_desc': return getDuration(b) - getDuration(a);
                        case 'duration_asc':  return getDuration(a) - getDuration(b);
                        case 'area': 
                            const cA = a.country || '中国';
                            const cB = b.country || '中国';
                            if (cA !== cB) return cA.localeCompare(cB);
                            return (a.region || '').localeCompare(b.region || '');
                        default: return 0;
                    }
                });
                return results;
            },
            displayCards() { return this.allResults.slice(0, this.displayCount); },
            totalFilteredCount() { return this.allResults.length; }
        },
        watch: {
            // 当接口数据返回时，自动初始化地图
            postcards() {
                this.$nextTick(() => {
                    this.initMap();
                });
            },
            allResults() { 
                this.displayCount = 12; 
                this.updateMap(); 
            }
        },
        mounted() {
            // 如果已经在 index.html 加载了数据，这里可以作为备用触发
            if (this.postcards.length > 0) {
                this.initMap();
            }
            window.addEventListener('resize', () => this.myChart && this.myChart.resize());
        },
        methods: {
            toggleMap(type) { 
                this.mapType = type; 
                this.filterProvince = '';
                this.filterCountry = '';
                this.updateMap(); 
            },
            resetAll() {
                this.filterCountry = ''; this.filterProvince = ''; 
                this.filterCity = ''; this.filterType = '';
                this.filterId = ''; this.filterPlatform = ''; this.filterTag = '';
                this.sortBy = 'id_desc'; this.displayCount = 12;
            },
            initMap() {
                const dom = document.getElementById('map-container');
                if (!dom || this.myChart) return; // 避免重复初始化
                this.myChart = echarts.init(dom);
                this.myChart.on('click', (p) => { 
                    if (this.mapType === 'china') {
                        this.filterCountry = '中国';
                        this.filterProvince = p.name;
                    } else {
                        const chineseName = this.reverseCountryMap[p.name] || p.name;
                        this.filterCountry = chineseName;
                        this.filterProvince = '';
                    }
                    const el = document.querySelector('.main-grid');
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                });
                this.updateMap();
            },
            updateMap() {
                if (!this.myChart || !this.postcards.length) return;
                const stats = {};
                this.postcards.forEach(c => {
                    let key = "";
                    if (this.mapType === 'china') {
                        if (!c.country || c.country === '中国') {
                            if (c.region) {
                                key = c.region.substring(0, 2);
                                if (key === '内蒙') key = '内蒙古';
                                if (key === '黑龙') key = '黑龙江';
                            }
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

                const mapData = Object.keys(stats).map(k => ({ 
                    name: k, value: stats[k].total, send: stats[k].send, receive: stats[k].receive 
                }));

                this.myChart.setOption({
                    tooltip: { 
                        trigger: 'item', 
                        formatter: (p) => p.data ? `<b>${p.name}</b><br/>总数: ${p.data.value}<br/>📥 收到: ${p.data.receive}<br/>📤 寄出: ${p.data.send}` : `${p.name}: 0` 
                    },
                    visualMap: { 
                        min: 0, max: Math.max(...mapData.map(d=>d.value), 5), 
                        left: 'left', inRange: { color: ['#e0f3f8', '#4361ee'] }, calculable: true 
                    },
                    series: [{ 
                        type: 'map', mapType: this.mapType, data: mapData, roam: true, 
                        label: { show: this.mapType === 'china', fontSize: 10 }, 
                        itemStyle: { borderColor: '#fff', areaColor: '#f5f5f5' },
                        emphasis: { itemStyle: { areaColor: '#ff9f1c' } }
                    }]
                }, true);
            }
        }
    });
}