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
        const downloadBtn = document.getElementById('download-btn');
        const resetBtn = document.getElementById('reset-btn');

        downloadBtn.addEventListener('click', this.downloadImage.bind(this));
        resetBtn.addEventListener('click', this.reset.bind(this));
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);

        if (files.length !== 2) {
            alert('画像ファイルとGeoJSONファイルを1つずつドロップしてください。');
            return;
        }

        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const geojsonFiles = files.filter(file =>
            file.type === 'application/json' ||
            file.name.toLowerCase().endsWith('.geojson') ||
            file.name.toLowerCase().endsWith('.json')
        );

        if (imageFiles.length !== 1 || geojsonFiles.length !== 1) {
            alert('画像ファイル1つとGeoJSONファイル1つが必要です。');
            return;
        }

        this.imageFile = imageFiles[0];
        this.geojsonFile = geojsonFiles[0];

        this.loadFiles();
    }

    async loadFiles() {
        try {
            // 画像の読み込み
            await this.loadImage();

            // GeoJSONの読み込み
            await this.loadGeoJSON();

            // 描画処理
            this.renderVisualization();

        } catch (error) {
            console.error('ファイル読み込みエラー:', error);
            alert('ファイルの読み込みに失敗しました。');
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

    renderVisualization() {
        // ドロップエリアを非表示にし、キャンバスを表示
        document.getElementById('drop-area').style.display = 'none';
        document.getElementById('canvas-container').style.display = 'flex';

        // キャンバスの設定
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');

        // キャンバスサイズを画像に合わせる
        this.canvas.width = this.imageData.width;
        this.canvas.height = this.imageData.height;

        // 画像を描画
        this.ctx.drawImage(this.imageData, 0, 0);

        // GeoJSONを描画
        this.drawGeoJSON();
    }

    drawGeoJSON() {
        if (!this.geojsonData || !this.geojsonData.features) {
            console.warn('有効なGeoJSONデータがありません。');
            return;
        }

        this.geojsonData.features.forEach((feature, featureIndex) => {
            this.drawFeature(feature, featureIndex);
        });
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

            // 点を描画
            this.ctx.fillStyle = '#3498db';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
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

            // 点を描画
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();

            // ノード番号を描画（最後の点は最初の点と同じなので除外）
            if (index < outerRing.length - 1) {
                this.drawLabel(x, y, (index + 1).toString(), '#2ecc71');
            }
        });
    }

    drawLabel(x, y, text, color) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

        const metrics = this.ctx.measureText(text);
        const padding = 4;
        const labelX = x + 8;
        const labelY = y - 8;

        // 背景を描画
        this.ctx.fillRect(
            labelX - padding,
            labelY - 12 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
        );

        // 枠線を描画
        this.ctx.strokeRect(
            labelX - padding,
            labelY - 12 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
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

        // UIをリセット
        document.getElementById('drop-area').style.display = 'flex';
        document.getElementById('canvas-container').style.display = 'none';
    }
}

// アプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    new GeoJSONWindingChecker();
});
