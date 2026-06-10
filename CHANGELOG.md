# Changelog

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
