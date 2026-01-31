// --- CẤU HÌNH TOÀN CỤC ---
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 5;
let sortDirection = { title: 'asc', price: 'asc' };

// --- 1. HÀM XỬ LÝ LINK ẢNH (LỌC SẠCH DỮ LIỆU RÁC) ---
function getCleanImageUrl(imageField) {
    if (!imageField) return "https://placehold.co/100?text=No+Image";

    let url = imageField;

    // Trường hợp 1: API trả về mảng ["url"]
    if (Array.isArray(url)) {
        if (url.length === 0) return "https://placehold.co/100?text=No+Image";
        url = url[0]; // Lấy phần tử đầu tiên
    }

    // Trường hợp 2: API trả về chuỗi bẩn (Vd: '["https://..."]')
    if (typeof url === 'string') {
        // Dùng Regex để chỉ lấy đúng phần bắt đầu bằng http/https
        // Bỏ qua tất cả các ký tự ngoặc vuông [], ngoặc kép "" thừa thãi
        const match = url.match(/(https?:\/\/[^"\]\s,]+)/);
        if (match) {
            return match[0];
        }
    }
    
    // Nếu vẫn không phải link hợp lệ
    if (typeof url !== 'string' || !url.startsWith('http')) {
         return "https://placehold.co/100?text=No+Image";
    }

    return url;
}

// --- 2. GỌI API & LỌC DỮ LIỆU RÁC ---
async function getAllProducts() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Đang tải dữ liệu...</td></tr>';
    
    try {
        const response = await fetch('https://api.escuelajs.co/api/v1/products');
        const data = await response.json();
        
        // --- BỘ LỌC THÔNG MINH ---
        // Chỉ lấy những sản phẩm "xịn", loại bỏ hàng rác test
        allProducts = data.filter(product => {
            // 1. Bỏ sản phẩm có tên chứa chữ "test" hoặc "create"
            const name = product.title.toLowerCase();
            const isJunkName = name.includes('test') || name.includes('create') || name.includes('new product');
            
            // 2. Bỏ sản phẩm dùng ảnh placeholder màu xám (placehold.co)
            const image = Array.isArray(product.images) ? product.images[0] : product.images;
            const isJunkImage = typeof image === 'string' && image.includes('placehold.co');

            // Giữ lại sản phẩm nếu KHÔNG phải tên rác VÀ KHÔNG phải ảnh rác
            return !isJunkName && !isJunkImage;
        });

        filteredProducts = [...allProducts];
        renderTable();
    } catch (error) {
        console.error('Lỗi API:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Không thể kết nối đến API!</td></tr>';
    }
}

// --- 3. HIỂN THỊ BẢNG (FIX LỖI 403) ---
function renderTable() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Không tìm thấy sản phẩm nào!</td></tr>';
        document.getElementById('pageInfo').innerText = `Trang 0 / 0`;
        return;
    }

    // Tính toán phân trang
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredProducts.slice(startIndex, endIndex);

    paginatedData.forEach(product => {
        const cleanImg = getCleanImageUrl(product.images);

        const tr = document.createElement('tr');
        // QUAN TRỌNG: referrerpolicy="no-referrer" giúp tránh lỗi 403 Forbidden từ Imgur
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.title}</td>
            <td>$${product.price}</td>
            <td>
                <div class="img-container">
                    <img src="${cleanImg}" 
                         alt="${product.title}" 
                         class="product-img"
                         referrerpolicy="no-referrer" 
                         onerror="this.onerror=null; this.src='https://placehold.co/100?text=Lỗi+Ảnh';">
                </div>
            </td>
            <td class="desc-col">${product.description}</td>
        `;
        tbody.appendChild(tr);
    });

    // Cập nhật thông tin trang
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    document.getElementById('pageInfo').innerText = `Trang ${currentPage} / ${totalPages > 0 ? totalPages : 1}`;
    
    // Cập nhật trạng thái nút
    document.getElementById('btnPrev').disabled = currentPage === 1;
    document.getElementById('btnNext').disabled = currentPage >= totalPages;
}

// --- 4. TÌM KIẾM ---
function handleSearch() {
    const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!keyword) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => p.title.toLowerCase().includes(keyword));
    }
    currentPage = 1;
    renderTable();
}

// --- 5. ĐỔI SỐ LƯỢNG HIỂN THỊ ---
function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSize').value);
    currentPage = 1;
    renderTable();
}

// --- 6. SẮP XẾP ---
function sortData(column) {
    sortDirection[column] = sortDirection[column] === 'asc' ? 'desc' : 'asc';
    
    // Cập nhật icon mũi tên (UI)
    document.querySelectorAll('.sort-icon').forEach(el => el.innerHTML = '&#8693;'); // Reset icon
    const currentIcon = document.getElementById(`sort-${column}`);
    if(currentIcon) currentIcon.innerHTML = sortDirection[column] === 'asc' ? '&#8593;' : '&#8595;';

    filteredProducts.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'title') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection[column] === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection[column] === 'asc' ? 1 : -1;
        return 0;
    });
    renderTable();
}

// --- 7. PHÂN TRANG ---
function prevPage() { if (currentPage > 1) { currentPage--; renderTable(); } }
function nextPage() { 
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderTable(); } 
}

// CHẠY CODE
getAllProducts();