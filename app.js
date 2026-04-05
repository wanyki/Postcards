// ⚠️ 你的 Supabase 配置
const supabaseUrl = 'https://ulhisqjzcruraoqvoagc.supabase.co';
const supabaseKey = 'sb_publishable_lneCbBRiTL4tAKv32Nedcw_qSF3IBrq';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

if (document.getElementById('app')) {
    new Vue({
        el: '#app',
        data: {
            postcards: [], // 初始为空，等待数据加载
            loading: true,
            
            // 筛选条件
            filterCountry: '', 
            filterProvince: '', 
            filterCity: '', 
            filterType: '', 
            filterId: '', 
            filterPlatform: '', 
            filterTag: '',
            sortBy: 'date_desc', // 👈 仅修改了这里：默认按照日期近优先排序
            
            // 页面控制
            displayCount: 12, 
            mapType: 'china',
            myChart: null,
            
            // 映射字典
           countryMap: {
    // ==================== 亚洲 ====================
    "中国": "China",
    "日本": "Japan",
    "韩国": "Korea",
    "朝鲜": "North Korea",
    "新加坡": "Singapore",
    "马来西亚": "Malaysia",
    "印度尼西亚": "Indonesia",
    "印度": "India",
    "巴基斯坦": "Pakistan",
    "孟加拉国": "Bangladesh",
    "菲律宾": "Philippines",
    "越南": "Vietnam",
    "泰国": "Thailand",
    "缅甸": "Myanmar",
    "柬埔寨": "Cambodia",
    "老挝": "Laos",
    "蒙古": "Mongolia",
    "尼泊尔": "Nepal",
    "斯里兰卡": "Sri Lanka",
    "阿联酋": "United Arab Emirates",
    "沙特阿拉伯": "Saudi Arabia",
    "土耳其": "Turkey",
    "以色列": "Israel",
    "伊朗": "Iran",
    "伊拉克": "Iraq",
    "卡塔尔": "Qatar",
    "科威特": "Kuwait",

    // ==================== 欧洲 ====================
    "俄罗斯": "Russia",
    "德国": "Germany",
    "英国": "United Kingdom",
    "法国": "France",
    "白俄罗斯": "Belarus",
    "瑞士": "Switzerland",
    "瑞典": "Sweden",
    "挪威": "Norway",
    "乌克兰": "Ukraine",
    "波兰": "Poland",
    "罗马尼亚": "Romania",
    "匈牙利": "Hungary",
    "捷克": "Czech Republic",
    "奥地利": "Austria",
    "丹麦": "Denmark",
    "芬兰": "Finland",
    "冰岛": "Iceland",
    "爱尔兰": "Ireland",
    "葡萄牙": "Portugal",
    "希腊": "Greece",
    "比利时": "Belgium",
    "卢森堡": "Luxembourg",
    "保加利亚": "Bulgaria",
    "塞尔维亚": "Serbia",
    "克罗地亚": "Croatia",
    "斯洛文尼亚": "Slovenia",
    "立陶宛": "Lithuania",
    "拉脱维亚": "Latvia",
    "爱沙尼亚": "Estonia",
    "意大利": "Italy",
    "西班牙": "Spain",
    "荷兰": "Netherlands",

    // ==================== 非洲 ====================
    "南非": "South Africa",
    "埃及": "Egypt",
    "尼日利亚": "Nigeria",
    "肯尼亚": "Kenya",
    "阿尔及利亚": "Algeria",
    "摩洛哥": "Morocco",
    "埃塞俄比亚": "Ethiopia",
    "加纳": "Ghana",

    // ==================== 北美洲 ====================
    "美国": "United States",
    "加拿大": "Canada",
    "墨西哥": "Mexico",
    "古巴": "Cuba",
    "巴拿马": "Panama",

    // ==================== 南美洲 ====================
    "巴西": "Brazil",
    "阿根廷": "Argentina",
    "智利": "Chile",
    "秘鲁": "Peru",
    "哥伦比亚": "Colombia",
    "委内瑞拉": "Venezuela",

    // ==================== 大洋洲 ====================
    "澳大利亚": "Australia",
    "新西兰": "New Zealand",
    "斐济": "Fiji",
    "巴布亚新几内亚": "Papua New Guinea"
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
        mounted() {
            this.fetchData();
            this.initMap();
            window.addEventListener('resize', () => this.myChart && this.myChart.resize());
        },
        methods: {
            async fetchData() {
                try {
                    // 从 Supabase 获取数据
                    let { data, error } = await supabaseClient
                        .from('postcard')
                        .select('*');

                    if (error) throw error;

                    // 数据映射：将数据库字段转为 Vue 使用的驼峰字段
                    this.postcards = data.map(item => {
                        let tags = item.tags;
                        if (typeof tags === 'string') {
                            tags = tags.replace(/[\[\]"]/g, '').split(',').filter(t => t.trim() !== '');
                        } else if (!tags) tags = [];

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
                    });
                    
                    this.loading = false;
                    // 数据加载后更新地图
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
            updateMap() {
                if (!this.myChart) return;
                const stats = {};
                
                // 聚合数据逻辑
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