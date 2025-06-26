import './styles.css';

class GeoJSONWindingChecker {
    constructor() {
        this.imageFile = null;
        this.geojsonFile = null;
        this.imageData = null;
        this.geojsonData = null;
        this.canvas = null;
        this.ctx = null;

        this.init();
    }

    init() {
        this.setupDropArea();
        this.setupButtons();
        this.updateUI();
    }

    setupDropArea() {
        const dropArea = document.getElementById('drop-area');

        // ドラッグオーバー時のスタイル変更
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            }, false);
        });

        // ファイルドロップ処理
        dropArea.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    setupButtons() {
        const executeBtn = document.getElementById('execute-btn');
        const downloadBtn = document.getElementById('download-btn');
        const resetBtn = document.getElementById('reset-btn');

        executeBtn.addEventListener('click', this.executeVisualization.bind(this));
        downloadBtn.addEventListener('click', this.downloadImage.bind(this));
        resetBtn.addEventListener('click', this.reset.bind(this));
    }

    setupFilterControl() {
        const nodeFilter = document.getElementById('node-filter');
        const filterOperator = document.getElementById('filter-operator');

        nodeFilter.addEventListener('input', this.applyFilter.bind(this));
        filterOperator.addEventListener('change', this.applyFilter.bind(this));
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);

        if (files.length === 0) {
            return;
        }

        // 複数ファイルがドロップされた場合は最初のファイルのみ処理
        const file = files[0];

        if (this.isImageFile(file)) {
            this.handleImageFile(file);
        } else if (this.isGeoJSONFile(file)) {
            this.handleGeoJSONFile(file);
        } else {
            alert('サポートされていないファイル形式です。画像ファイル（PNG, JPG等）またはGeoJSONファイル（.geojson, .json）をドロップしてください。');
        }
    }

    isImageFile(file) {
        return file.type.startsWith('image/');
    }

    isGeoJSONFile(file) {
        return file.type === 'application/json' ||
               file.name.toLowerCase().endsWith('.geojson') ||
               file.name.toLowerCase().endsWith('.json');
    }

    async handleImageFile(file) {
        try {
            this.imageFile = file;
            await this.loadImage();
            this.showImagePreview();
            this.updateUI();
        } catch (error) {
            console.error('画像ファイル読み込みエラー:', error);
            alert('画像ファイルの読み込みに失敗しました。');
        }
    }

    async handleGeoJSONFile(file) {
        try {
            this.geojsonFile = file;
            await this.loadGeoJSON();
            this.showGeoJSONDump();
            this.updateUI();
        } catch (error) {
            console.error('GeoJSONファイル読み込みエラー:', error);
            alert('GeoJSONファイルの読み込みに失敗しました。');
        }
    }

    loadImage() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.imageData = img;
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.imageFile);
        });
    }

    loadGeoJSON() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.geojsonData = JSON.parse(e.target.result);
                    resolve();
                } catch (error) {
                    reject(new Error('GeoJSONの解析に失敗しました。'));
                }
            };
            reader.onerror = reject;
            reader.readAsText(this.geojsonFile);
        });
    }

    showImagePreview() {
        const previewContainer = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const fileName = document.getElementById('image-file-name');

        previewImg.src = URL.createObjectURL(this.imageFile);
        fileName.textContent = this.imageFile.name;
        previewContainer.style.display = 'block';
    }

    showGeoJSONDump() {
        const dumpContainer = document.getElementById('geojson-dump');
        const contentTextarea = document.getElementById('geojson-content');
        const fileName = document.getElementById('geojson-file-name');

        contentTextarea.value = JSON.stringify(this.geojsonData, null, 2);
        fileName.textContent = this.geojsonFile.name;
        dumpContainer.style.display = 'block';
    }

    updateUI() {
        // ステータスアイコンの更新
        const imageStatusIcon = document.getElementById('image-status-icon');
        const geojsonStatusIcon = document.getElementById('geojson-status-icon');

        if (this.imageFile) {
            imageStatusIcon.textContent = '✅';
            imageStatusIcon.className = 'status-icon loaded';
        } else {
            imageStatusIcon.textContent = '⭕';
            imageStatusIcon.className = 'status-icon empty';
        }

        if (this.geojsonFile) {
            geojsonStatusIcon.textContent = '✅';
            geojsonStatusIcon.className = 'status-icon loaded';
        } else {
            geojsonStatusIcon.textContent = '⭕';
            geojsonStatusIcon.className = 'status-icon empty';
        }

        // 実行ボタンの有効/無効切り替え
        const executeBtn = document.getElementById('execute-btn');
        executeBtn.disabled = !(this.imageFile && this.geojsonFile);
    }

    executeVisualization() {
        if (!this.imageFile || !this.geojsonFile) {
            alert('画像ファイルとGeoJSONファイルの両方が必要です。');
            return;
        }

        this.renderVisualization();
    }

    renderVisualization() {
        // ドロップエリアとファイル状態を非表示にし、キャンバスを表示
        document.getElementById('drop-area').style.display = 'none';
        document.getElementById('file-status').style.display = 'none';
        document.getElementById('execute-section').style.display = 'none';
        document.getElementById('canvas-container').style.display = 'flex';

        // キャンバスの設定
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');

        // キャンバスサイズを画像に合わせる
        this.canvas.width = this.imageData.width;
        this.canvas.height = this.imageData.height;

        // 画像を描画
        this.ctx.drawImage(this.imageData, 0, 0);

        // フィルタコントロールをセットアップ
        this.setupFilterControl();

        // GeoJSONを描画
        this.drawGeoJSON();
    }

    drawGeoJSON() {
        if (!this.geojsonData || !this.geojsonData.features) {
            console.warn('有効なGeoJSONデータがありません。');
            return;
        }

        // フィルタ値を取得
        const nodeFilter = document.getElementById('node-filter');
        const filterOperator = document.getElementById('filter-operator');
        const filterValue = parseInt(nodeFilter.value) || 0;
        const operator = filterOperator.value;

        this.geojsonData.features.forEach((feature, featureIndex) => {
            // ノード数をチェック
            const nodeCount = this.getFeatureNodeCount(feature);

            // フィルタ条件をチェック
            let shouldShow = true;
            if (filterValue > 0) {
                if (operator === 'below') {
                    // 指定値以下のノード数を持つfeatureを除外
                    shouldShow = nodeCount > filterValue;
                } else if (operator === 'above') {
                    // 指定値以上のノード数を持つfeatureを除外
                    shouldShow = nodeCount < filterValue;
                }
            }

            if (shouldShow) {
                this.drawFeature(feature, featureIndex);
            }
        });
    }

    getFeatureNodeCount(feature) {
        const geometry = feature.geometry;

        switch (geometry.type) {
            case 'Point':
                return 1;
            case 'LineString':
                return geometry.coordinates.length;
            case 'Polygon':
                // 外側のリングのノード数（最後の重複点を除外）
                return geometry.coordinates[0].length - 1;
            case 'MultiPoint':
                return geometry.coordinates.length;
            case 'MultiLineString':
                return geometry.coordinates.reduce((total, lineCoords) => {
                    return total + lineCoords.length;
                }, 0);
            case 'MultiPolygon':
                return geometry.coordinates.reduce((total, polygonCoords) => {
                    return total + (polygonCoords[0].length - 1);
                }, 0);
            default:
                return 0;
        }
    }

    applyFilter() {
        if (!this.canvas || !this.ctx) return;

        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 画像を再描画
        this.ctx.drawImage(this.imageData, 0, 0);

        // フィルタを適用してGeoJSONを再描画
        this.drawGeoJSON();
    }

    drawFeature(feature, featureIndex) {
        const geometry = feature.geometry;

        switch (geometry.type) {
            case 'Point':
                this.drawPoint(geometry.coordinates, featureIndex);
                break;
            case 'LineString':
                this.drawLineString(geometry.coordinates, featureIndex);
                break;
            case 'Polygon':
                this.drawPolygon(geometry.coordinates, featureIndex);
                break;
            case 'MultiPoint':
                geometry.coordinates.forEach((coords, index) => {
                    this.drawPoint(coords, `${featureIndex}-${index}`);
                });
                break;
            case 'MultiLineString':
                geometry.coordinates.forEach((lineCoords, index) => {
                    this.drawLineString(lineCoords, `${featureIndex}-${index}`);
                });
                break;
            case 'MultiPolygon':
                geometry.coordinates.forEach((polygonCoords, index) => {
                    this.drawPolygon(polygonCoords, `${featureIndex}-${index}`);
                });
                break;
        }
    }

    drawPoint(coordinates, label) {
        const [x, y] = coordinates;

        // 点を描画
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fill();

        // ラベルを描画
        this.drawLabel(x, y, '1', '#e74c3c');
    }

    drawLineString(coordinates, label) {
        if (coordinates.length < 2) return;

        // 線を描画
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const [startX, startY] = coordinates[0];
        this.ctx.moveTo(startX, startY);

        for (let i = 1; i < coordinates.length; i++) {
            const [x, y] = coordinates[i];
            this.ctx.lineTo(x, y);
        }

        this.ctx.stroke();

        // 各点にノード番号を描画
        coordinates.forEach((coord, index) => {
            const [x, y] = coord;

            // 点を描画（サイズを3→5に拡大）
            this.ctx.fillStyle = '#3498db';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();

            // ノード番号を描画
            this.drawLabel(x, y, (index + 1).toString(), '#3498db');
        });
    }

    drawPolygon(coordinates, label) {
        if (coordinates.length === 0) return;

        // 外側のリング（最初の配列）を描画
        const outerRing = coordinates[0];
        if (outerRing.length < 3) return;

        // 面を描画
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const [startX, startY] = outerRing[0];
        this.ctx.moveTo(startX, startY);

        for (let i = 1; i < outerRing.length; i++) {
            const [x, y] = outerRing[i];
            this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // 内側のリング（穴）があれば描画
        for (let ringIndex = 1; ringIndex < coordinates.length; ringIndex++) {
            const innerRing = coordinates[ringIndex];

            this.ctx.fillStyle = '#f5f5f5';
            this.ctx.beginPath();

            const [holeStartX, holeStartY] = innerRing[0];
            this.ctx.moveTo(holeStartX, holeStartY);

            for (let i = 1; i < innerRing.length; i++) {
                const [x, y] = innerRing[i];
                this.ctx.lineTo(x, y);
            }

            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }

        // 各点にノード番号を描画（外側のリングのみ）
        outerRing.forEach((coord, index) => {
            const [x, y] = coord;

            // 点を描画（サイズを3→5に拡大）
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
            this.ctx.fill();

            // ノード番号を描画（最後の点は最初の点と同じなので除外）
            if (index < outerRing.length - 1) {
                this.drawLabel(x, y, (index + 1).toString(), '#2ecc71');
            }
        });
    }

    drawLabel(x, y, text, color) {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        const metrics = this.ctx.measureText(text);
        const padding = 6;
        const labelX = x + 8;
        const labelY = y - 8;

        // 背景を描画
        this.ctx.fillRect(
            labelX - padding,
            labelY - 16 - padding,
            metrics.width + padding * 2,
            20 + padding * 2
        );

        // 枠線を描画
        this.ctx.strokeRect(
            labelX - padding,
            labelY - 16 - padding,
            metrics.width + padding * 2,
            20 + padding * 2
        );

        // テキストを描画
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, labelX, labelY);
    }

    downloadImage() {
        if (!this.canvas) return;

        const link = document.createElement('a');
        link.download = 'geojson-visualization.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    reset() {
        // データをリセット
        this.imageFile = null;
        this.geojsonFile = null;
        this.imageData = null;
        this.geojsonData = null;
        this.canvas = null;
        this.ctx = null;

        // プレビューをクリア
        const imagePreview = document.getElementById('image-preview');
        const geojsonDump = document.getElementById('geojson-dump');
        imagePreview.style.display = 'none';
        geojsonDump.style.display = 'none';

        // UIをリセット
        document.getElementById('drop-area').style.display = 'flex';
        document.getElementById('file-status').style.display = 'grid';
        document.getElementById('execute-section').style.display = 'block';
        document.getElementById('canvas-container').style.display = 'none';

        // ステータスを更新
        this.updateUI();
    }
}

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    new GeoJSONWindingChecker();
});
