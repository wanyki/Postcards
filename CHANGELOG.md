# Changelog

## [1.2.0] - 2026-07-14

### Changed - 管理后台体验优化

#### 添加明信片表单优化
- 将“平台”字段从纯文本输入改为下拉选择，内置 `Post-Hi`、`Manyour`、`Postcrossing` 三个常用平台。
- 新增“自定义”平台选项，选择后可手动输入平台名称；编辑旧数据时，非预设平台会自动回填到自定义输入框。
- 图片链接支持根据明信片编号自动生成，格式为：

```text
https://img.yuechucard.space/[ID]图像面.jpg
```

#### 数据概览页增强
- 新增“国家/地区排行 Top 5”，按地区优先、国家兜底统计明信片数量，并显示收到/寄出明细。
- 新增“平台分布”饼图，展示不同平台的数量和占比，并加入鼠标悬浮动效。
- 新增“最近动态”，展示最近维护的明信片记录。
- 新增“近六月收寄趋势”，按月份统计收到与寄出数量。
- 优化概览页布局，改为更稳定的响应式网格，避免卡片高度错位。

**修改的文件：**
- `admin.html` - 优化后台添加明信片表单与数据概览面板

---

## [1.1.1] - 2026-06-10

### Fixed - 图片加载优化

#### 移除图片时间戳
移除图片 URL 中的时间戳参数，恢复浏览器缓存机制，提升图片加载速度。

**问题原因：**
```javascript
// 之前：每次加载都生成新URL，浏览器缓存失效
card.imgFront + '?t=' + new Date().getTime()
```

**修复后：**
```javascript
// 直接使用原URL，浏览器会缓存
card.imgFront
```

**修改的文件：**
- `index.html` - 移除图片时间戳
- `detail.html` - 移除图片时间戳
- `timeline.html` - 移除图片时间戳

#### 其他修复
- 添加 favicon，消除 404 错误

---

## [1.1.0] - 2026-06-10

### Changed - 性能优化

#### CDN 资源本地化
将所有外部 CDN 资源改为本地加载，提升国内服务器访问速度。

**新增本地文件：**
- `libs/bootstrap.min.css` - Bootstrap 5.3.0 样式
- `libs/font-awesome.min.css` - Font Awesome 6.4.0 图标样式
- `libs/bootstrap-icons.css` - Bootstrap Icons 1.10.0 样式
- `libs/echarts.min.js` - ECharts 5.4.3 图表库
- `libs/echarts-china.js` - 中国地图数据
- `libs/echarts-world.js` - 世界地图数据
- `libs/vue.js` - Vue.js 2.7.14
- `libs/xlsx.min.js` - XLSX 0.18.5 表格处理库
- `libs/webfonts/` - Font Awesome 字体文件
- `libs/fonts/` - Bootstrap Icons 字体文件

**修改的文件：**
- `index.html` - 更新资源引用路径
- `detail.html` - 更新资源引用路径
- `timeline.html` - 更新资源引用路径
- `dashboard.html` - 更新资源引用路径
- `admin.html` - 更新资源引用路径

#### 服务器配置优化
- 添加字体文件 MIME 类型设置
- 临时禁用 helmet 安全中间件（调试用）

---

## [1.0.0] - 初始版本

### Features
- 明信片管理与展示系统
- 支持收发明信片记录
- 国内/世界地图热力分布
- 时间线筛选功能
- 数据统计面板
- 管理后台
