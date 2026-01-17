if (document.getElementById('app')) {
    new Vue({
        el: '#app',
        data: {
            // 新增 filterCountry
            filterCountry: '', filterProvince: '', filterCity: '', filterType: '', 
            filterId: '', filterPlatform: '', filterTag: '',
            sortBy: 'id_desc',
            postcards: typeof postcardData !== 'undefined' ? postcardData : [],
            myChart: null,
            displayCount: 12, 
            mapType: 'china',
            // 用于 ECharts 全球地图(英文)与数据(中文)的转换
            countryMap: { 
                "中国": "China", "日本": "Japan", "美国": "United States", 
                "德国": "Germany", "英国": "United Kingdom", "法国": "France", 
                "韩国": "Korea", "俄罗斯": "Russia", "加拿大": "Canada", "澳大利亚": "Australia"
            }
        },
        computed: {
            // 反向映射表：从 "Japan" 找回 "日本"
            reverseCountryMap() {
                const rev = {};
                for (let key in this.countryMap) {
                    rev[this.countryMap[key]] = key;
                }
                return rev;
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
            // 自动提取数据中存在的所有国家
            countries() {
                const cs = this.postcards.map(c => c.country || '中国');
                return [...new Set(cs)].sort();
            },
            provinces() {
                // 仅当筛选中国或未筛选国家时，显示省份列表
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
    
    // --- 第一步：过滤逻辑 (保持原有逻辑并增强) ---
    let results = this.postcards.filter(c => {
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
        const searchPool = [
            tags, 
            c.note || '', 
            c.region || '', 
            cardCountry,
            c.person || ''
        ].join('|').toLowerCase();
        const mTag = !kwTag || searchPool.includes(kwTag);

        return mCountry && mProv && mCity && mType && mPlat && mId && mTag;
    });

    // --- 第二步：增强型排序逻辑 ---
    results.sort((a, b) => {
        // 预处理日期
        const dateA = new Date(a.receiveDate || a.sendDate || 0);
        const dateB = new Date(b.receiveDate || b.sendDate || 0);

        // 辅助：计算漂流天数
        const getDuration = (card) => {
            if (!card.receiveDate || !card.sendDate) return 0;
            const start = new Date(card.sendDate);
            const end = new Date(card.receiveDate);
            // 计算差值并转为天数
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            return diff >= 0 ? diff : 0;
        };

        switch (this.sortBy) {
            // 1. 编号排序 (支持混有字母的数字排序)
            case 'id_desc': 
                return b.id.localeCompare(a.id, undefined, {numeric: true});
            case 'id_asc':  
                return a.id.localeCompare(b.id, undefined, {numeric: true});

            // 2. 日期排序 (修复原本 localeCompare 字符串比较不准的问题)
            case 'date_desc': 
                return dateB - dateA;
            case 'date_asc':  
                return dateA - dateB;

            // 3. 漂流时长排序
            case 'duration_desc': 
                return getDuration(b) - getDuration(a);
            case 'duration_asc':  
                return getDuration(a) - getDuration(b);

            // 4. 地理位置排序 (先国家后省份)
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
            // 当筛选条件变化，重置分页并更新地图高亮
            allResults() { 
                this.displayCount = 12; 
                this.updateMap(); 
            }
        },
        mounted() {
            this.initMap();
            window.addEventListener('resize', () => this.myChart && this.myChart.resize());
        },
        methods: {
            toggleMap(type) { 
                this.mapType = type; 
                // 切换地图时，建议重置部分地理筛选以防冲突
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
                if (!dom) return;
                this.myChart = echarts.init(dom);
                
                // 地图点击联动修复
                this.myChart.on('click', (p) => { 
                    if (this.mapType === 'china') {
                        this.filterCountry = '中国';
                        this.filterProvince = p.name;
                    } else {
                        // 如果点击的是全球地图，通过反向映射表转回中文名
                        const chineseName = this.reverseCountryMap[p.name] || p.name;
                        this.filterCountry = chineseName;
                        this.filterProvince = ''; // 选了国家，清空中国的省份
                    }
                    // 点击后自动滚动到列表
                    const el = document.querySelector('.main-grid');
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                });
                
                this.updateMap();
            },
            updateMap() {
                if (!this.myChart) return;
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
                }, true);
            }
        }
    });
}