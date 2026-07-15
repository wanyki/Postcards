if (document.getElementById('app')) {
    new Vue({
        el: '#app',
        data: {
            postcards: [],
            loading: true,
            
            filterCountry: '', 
            filterProvince: '', 
            filterCity: '', 
            filterType: '', 
            filterId: '', 
            filterPlatform: '', 
            filterTag: '',
            sortBy: 'date_desc',
            
            displayCount: 12, 
            mapType: 'china',
            myChart: null,
            
            countryMap: {}
        },
        computed: {
            reverseCountryMap() {
                return PostcardUtils.getReverseCountryMap(this.countryMap);
            },
            stats() {
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
                    .map(c => PostcardUtils.extractProvince(c.region))
                    .filter(it => it);
                return [...new Set(ps)].sort();
            },
            availableCities() {
                // 确保 chinaData 存在（通常在 cityData.js 里定义）
                if (!this.filterProvince || typeof chinaData === 'undefined') return [];
                return chinaData[this.filterProvince] || [];
            },
            platforms() {
                return [...new Set(this.postcards.map(c => c.platform).filter(p => p))];
            },
            
            // --- 核心逻辑：筛选与排序 ---
            allResults() {
                const kwTag = (this.filterTag || '').toLowerCase();
                const kwId = (this.filterId || '').toLowerCase();
                
                let results = this.postcards.filter(c => {
                    const cardCountry = c.country || '中国';
                    
                    // 1. 国家筛选
                    const mCountry = !this.filterCountry || cardCountry === this.filterCountry;
                    if (!mCountry) return false;

                    // 2. 地理明细筛选 (仅当选了中国才生效)
                    let mGeo = true;
                    if (this.filterCountry === '中国') {
                        const mProv = !this.filterProvince || (c.region && c.region.includes(this.filterProvince));
                        const mCity = !this.filterCity || (c.region && c.region.includes(this.filterCity));
                        mGeo = mProv && mCity;
                    }

                    // 3. 其他基础筛选
                    const mType = !this.filterType || c.type === this.filterType;
                    const mPlat = !this.filterPlatform || c.platform === this.filterPlatform;
                    const mId = !kwId || (c.id && c.id.toLowerCase().includes(kwId));
                    
                    // 4. 标签/关键词搜索 (搜索范围：tags, note, region, person)
                    const tags = Array.isArray(c.tags) ? c.tags.join(',') : '';
                    const searchPool = [
                        tags, 
                        c.note || '', 
                        c.region || '', 
                        cardCountry,
                        c.person || ''
                    ].join('|').toLowerCase();
                    const mTag = !kwTag || searchPool.includes(kwTag);

                    return mGeo && mType && mPlat && mId && mTag;
                });

                // 排序逻辑
                results.sort((a, b) => {
                    const dateA = new Date(a.receiveDate || a.sendDate || 0);
                    const dateB = new Date(b.receiveDate || b.sendDate || 0);

                    const getDuration = (card) => {
                        if (!card.receiveDate || !card.sendDate) return 0;
                        const start = new Date(card.sendDate);
                        const end = new Date(card.receiveDate);
                        const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                        return diff >= 0 ? diff : 0;
                    };

                    switch (this.sortBy) {
                        case 'id_desc': return (b.id || '').localeCompare(a.id || '', undefined, {numeric: true});
                        case 'id_asc':  return (a.id || '').localeCompare(b.id || '', undefined, {numeric: true});
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
            // 当筛选结果变化时，重置页数并更新地图
            allResults() { 
                this.displayCount = 12; 
                this.updateMap(); 
            }
        },
        async mounted() {
            this.countryMap = await PostcardUtils.loadCountryMap();
            this.fetchData();
            this.initMap();
            window.addEventListener('resize', () => this.myChart && this.myChart.resize());
        },
        methods: {
            async fetchData() {
                try {
                    this.postcards = await PostcardUtils.fetchPostcards();
                    
                    this.loading = false;
                    this.$nextTick(() => {
                        this.updateMap();
                    });

                } catch (e) {
                    console.error('Data Load Error:', e);
                    this.loading = false;
                }
            },
            handleCountryChange() {
                if (this.filterCountry !== '中国') {
                    this.filterProvince = '';
                    this.filterCity = '';
                }
            },
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
                // ⚠️ 为了保持一致，重置时也恢复为日期近优先
                this.sortBy = 'date_desc'; this.displayCount = 12;
            },
            initMap() {
                const dom = document.getElementById('map-container');
                if (!dom) return;
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
                    // 点击地图后滚动到筛选区
                    const el = document.querySelector('.main-grid');
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                });
                
                this.updateMap();
            },
            getRegionKey(card) {
                return PostcardUtils.getRegionKey(card, this.mapType, this.countryMap);
            },
            highlightMapRegion(card) {
                if (!this.myChart) return;
                const name = this.getRegionKey(card);
                if (!name) return;
                this.myChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: name });
            },
            downplayMapRegion() {
                if (!this.myChart) return;
                this.myChart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
            },
            updateMap() {
                if (!this.myChart) return;
                const stats = {};
                
                this.postcards.forEach(c => {
                    const key = PostcardUtils.getRegionKey(c, this.mapType, this.countryMap);
                    if (key) {
                        if (!stats[key]) stats[key] = { total: 0, send: 0, receive: 0 };
                        stats[key].total++;
                        c.type === '收到' ? stats[key].receive++ : stats[key].send++;
                    }
                });

                const mapData = Object.keys(stats).map(k => ({ 
                    name: k, 
                    value: stats[k].total, 
                    send: stats[k].send, 
                    receive: stats[k].receive 
                }));

                this.myChart.setOption({
                    tooltip: { 
                        trigger: 'item', 
                        formatter: (p) => p.data ? 
                            `<b>${p.name}</b><br/>总数: ${p.data.value}<br/>📥 收到: ${p.data.receive}<br/>📤 寄出: ${p.data.send}` 
                            : `${p.name}: 0` 
                    },
                    visualMap: { 
                        min: 0, 
                        max: Math.max(...mapData.map(d=>d.value), 5), 
                        left: 'left', 
                        inRange: { color: ['#e0f3f8', '#4361ee'] }, 
                        calculable: true 
                    },
                    series: [{ 
                        type: 'map', 
                        mapType: this.mapType, 
                        data: mapData, 
                        roam: true, 
                        label: { show: this.mapType === 'china', fontSize: 10 }, 
                        itemStyle: { borderColor: '#fff', areaColor: '#f5f5f5' },
                        emphasis: { itemStyle: { areaColor: '#ff9f1c' } }
                    }]
                });
            }
        }
    });
}