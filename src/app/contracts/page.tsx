'use client';

import { useState, useEffect, Fragment } from 'react';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ContractDocument {
    id: string;
    originalName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    documentType: string;
    approvalStatus: string;
    createdAt: string;
}

interface Contract {
    id: string;
    roomId: string;
    room: {
        number: string;
        building: { name: string };
    };
    personId: string;
    person: { name: string; email?: string };
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    deposit: number;
    productName?: string;
    productArea?: string;
    createdAt: string;
    documents: ContractDocument[];
}

interface Room {
    id: string;
    number: string;
    building: { name: string };
}

interface Person {
    id: string;
    name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function statusBadge(status: string) {
    if (status === 'ACTIVE') return 'emerald';
    if (status === 'DRAFT') return 'amber';
    return 'rose';
}

function typeBadge(type: string) {
    if (type === 'SALE') return 'purple';
    if (type === 'MANAGEMENT') return 'teal';
    if (type === 'LEASE_EXTEND') return 'amber';
    if (type === 'SHORT_TERM') return 'rose';
    return 'blue'; // RENTAL default
}

function approvalBadge(status: string) {
    if (status === 'APPROVED') return 'emerald';
    if (status === 'PENDING') return 'amber';
    return 'rose';
}

// ── Component ─────────────────────────────────────────────────────────────────

import { useLanguage } from '@/context/LanguageContext';
import CombinedSelect from '@/components/CombinedSelect';
import FilterArea from '@/components/FilterArea';

const VIETNAM_PROVINCES = [
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'TP Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

export default function ContractsPage() {
    const { t } = useLanguage();
    const [contracts, setContracts] = useState<Contract[]>([]);


    // Upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTenantName, setUploadTenantName] = useState('');
    const [uploadTenantEmail, setUploadTenantEmail] = useState('');
    const [uploadRoomNumber, setUploadRoomNumber] = useState('');
    const [uploadBuildingName, setUploadBuildingName] = useState('');
    const [uploadMonthlyRent, setUploadMonthlyRent] = useState('');
    const [uploadType, setUploadType] = useState('RENTAL');
    const [uploadProductFile, setUploadProductFile] = useState<File | null>(null);
    const [uploadProductName, setUploadProductName] = useState('');
    const [uploadProductArea, setUploadProductArea] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Detail modal
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [previewDocId, setPreviewDocId] = useState<string | null>(null);

    // Pagination
    const PAGE_SIZE = 6;
    const [currentPage, setCurrentPage] = useState(1);

    // Toast
    const [toastMsg, setToastMsg] = useState('');
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

    useEffect(() => {
        fetchContracts();
    }, []);

    // ── Fetchers ───────────────────────────────────────────────────────────────

    async function fetchContracts() {
        const res = await fetch('/api/contracts');
        const data = await res.json();
        setContracts(Array.isArray(data) ? data : []);
        setCurrentPage(1);
    }


    // ── Handlers ───────────────────────────────────────────────────────────────

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadFile || !uploadProductFile || !uploadTenantName.trim() || !uploadRoomNumber.trim() || !uploadBuildingName.trim() || !uploadMonthlyRent) {
            alert(t.contracts.alertRequired);
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('tenantName', uploadTenantName.trim());
        formData.append('tenantEmail', uploadTenantEmail.trim());
        formData.append('roomNumber', uploadRoomNumber.trim());
        formData.append('buildingName', uploadBuildingName.trim());
        formData.append('monthlyRent', uploadMonthlyRent);
        formData.append('type', uploadType);
        formData.append('productName', uploadProductName.trim());
        formData.append('productArea', uploadProductArea.trim());
        if (uploadProductFile) {
            formData.append('productFile', uploadProductFile);
        }

        try {
            const res = await fetch('/api/contracts/upload', {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadTenantName('');
                setUploadTenantEmail('');
                setUploadRoomNumber('');
                setUploadBuildingName('');
                setUploadMonthlyRent('');
                setUploadType('RENTAL');
                setUploadProductName('');
                setUploadProductArea('');
                setUploadProductFile(null);
                setToastMsg(t.contracts.toastSuccess);
                fetchContracts();
                setSelectedAreas([]);
                setTimeout(() => setToastMsg(''), 3000);
            } else {
                const data = await res.json();
                alert(data.error || t.contracts.errorUpload);
            }
        } catch (err) {
            console.error(err);
            alert(t.contracts.errorUpload);
        } finally {
            setIsUploading(false);
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>{t.contracts.pageTitle}</h1>
                    <p>{t.contracts.pageSubtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <FilterArea 
                        options={VIETNAM_PROVINCES}
                        selectedValues={selectedAreas}
                        onApply={(vals) => {
                            setSelectedAreas(vals);
                            setCurrentPage(1);
                        }}
                    />
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                        {t.contracts.uploadBtn}
                    </button>
                </div>
            </div>

            {/* ── Unified Contracts Table ── */}
            <div className="card-container">
                {contracts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📄</div>
                        <h3>{t.contracts.emptyTitle}</h3>
                        <p>{t.contracts.emptyDesc}</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{t.contracts.colTenant}</th>
                                        <th>{t.contracts.colProductName}</th>
                                        <th>{t.contracts.colProductArea}</th>
                                        <th>{t.contracts.colRoom}</th>
                                        <th>{t.contracts.colType}</th>
                                        <th>{t.contracts.colStatus}</th>
                                        <th>{t.contracts.colDate}</th>
                                        <th>{t.contracts.colRent}</th>
                                        <th>{t.contracts.colActions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contracts
                                        .filter(c => selectedAreas.length === 0 || (c.productArea && selectedAreas.includes(c.productArea)))
                                        .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                                        .map((contract) => (
                                        <tr key={contract.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{contract.person.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {contract.person.email || '—'}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{contract.productName || '—'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem' }}>{contract.productArea || '—'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{contract.room.number}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {contract.room.building.name}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${typeBadge(contract.type)}`}>
                                                    {t.contracts.types[contract.type as keyof typeof t.contracts.types] || contract.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${statusBadge(contract.status)}`}>
                                                    {t.contracts.statuses[contract.status as keyof typeof t.contracts.statuses] || contract.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    {formatDate(contract.createdAt)}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>
                                                {formatCurrency(contract.monthlyRent)}
                                            </td>
                                            <td>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => {
                                                            setSelectedContract(contract);
                                                            setShowDetailModal(true);
                                                        }}
                                                    >
                                                        {t.contracts.btnViewDetails}
                                                    </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Pagination ── */}
                        {(() => {
                            const filteredCount = contracts.filter(c => selectedAreas.length === 0 || (c.productArea && selectedAreas.includes(c.productArea))).length;
                            const totalPages = Math.ceil(filteredCount / PAGE_SIZE);
                            
                            if (totalPages <= 0) return null;

                            return (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    borderTop: '1px solid var(--border-subtle)',
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {t.contracts.paginationShowing} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCount)} {t.contracts.paginationOf} {filteredCount}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            {t.contracts.paginationPrev}
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                className="btn btn-sm"
                                                style={{
                                                    background: page === currentPage ? 'var(--accent-blue)' : 'transparent',
                                                    color: page === currentPage ? '#fff' : 'var(--text-secondary)',
                                                    border: page === currentPage ? 'none' : '1px solid var(--border-subtle)',
                                                    minWidth: '32px',
                                                }}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            {t.contracts.paginationNext}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>



            {/* ── Upload Contract PDF Modal ── */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => !isUploading && setShowUploadModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{t.contracts.modalUploadTitle}</h2>
                            <button className="modal-close" onClick={() => !isUploading && setShowUploadModal(false)} disabled={isUploading}>✕</button>
                        </div>
                        <form onSubmit={handleUpload}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.contracts.labelTenantName}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderName}
                                            value={uploadTenantName}
                                            onChange={(e) => setUploadTenantName(e.target.value)}
                                            required
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.contracts.labelTenantEmail}</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderEmail}
                                            value={uploadTenantEmail}
                                            onChange={(e) => setUploadTenantEmail(e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.contracts.labelRoomNumber}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderRoom}
                                            value={uploadRoomNumber}
                                            onChange={(e) => setUploadRoomNumber(e.target.value)}
                                            required
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.contracts.labelBuilding}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderBuilding}
                                            value={uploadBuildingName}
                                            onChange={(e) => setUploadBuildingName(e.target.value)}
                                            required
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.contracts.labelProductName}</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderProductName}
                                            value={uploadProductName}
                                            onChange={(e) => setUploadProductName(e.target.value)}
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.contracts.labelProductArea}</label>
                                        <CombinedSelect
                                            options={VIETNAM_PROVINCES}
                                            value={uploadProductArea}
                                            onChange={(val) => setUploadProductArea(val)}
                                            placeholder={t.contracts.placeholderProductArea}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t.contracts.labelRent}</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder={t.contracts.placeholderRent}
                                            min="0"
                                            value={uploadMonthlyRent}
                                            onChange={(e) => setUploadMonthlyRent(e.target.value)}
                                            required
                                            disabled={isUploading}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t.contracts.labelContractType}</label>
                                        <select
                                            className="form-select"
                                            value={uploadType}
                                            onChange={(e) => setUploadType(e.target.value)}
                                            required
                                            disabled={isUploading}
                                        >
                                            <option value="RENTAL">{t.contracts.types.RENTAL}</option>
                                            <option value="SALE">{t.contracts.types.SALE}</option>
                                            <option value="MANAGEMENT">{t.contracts.types.MANAGEMENT}</option>
                                            <option value="LEASE_EXTEND">{t.contracts.types.LEASE_EXTEND}</option>
                                            <option value="SHORT_TERM">{t.contracts.types.SHORT_TERM}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t.contracts.labelMainPDF}</label>
                                    <div className="file-upload-zone" style={{
                                        border: '2px dashed var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '20px',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        backgroundColor: uploadFile ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                                    }}
                                        onClick={() => document.getElementById('contract-file-input')?.click()}
                                    >
                                        <input
                                            id="contract-file-input"
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                            style={{ display: 'none' }}
                                            disabled={isUploading}
                                        />
                                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📄</div>
                                        {uploadFile ? (
                                            <div style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{uploadFile.name}</div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)' }}>{t.contracts.dropMainPDF}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.contracts.labelProductPDF}</label>
                                    <div className="file-upload-zone" style={{
                                        border: '2px dashed var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        backgroundColor: uploadProductFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                    }}
                                        onClick={() => document.getElementById('product-file-input')?.click()}
                                    >
                                        <input
                                            id="product-file-input"
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => setUploadProductFile(e.target.files ? e.target.files[0] : null)}
                                            style={{ display: 'none' }}
                                            disabled={isUploading}
                                        />
                                        <div style={{ fontSize: '1.25rem', marginBottom: '6px' }}>📎</div>
                                        {uploadProductFile ? (
                                            <div style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{uploadProductFile.name}</div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)' }}>{t.contracts.dropProductPDF}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)} disabled={isUploading}>{t.contracts.btnCancel}</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        !uploadFile ||
                                        !uploadProductFile ||
                                        !uploadTenantName.trim() ||
                                        !uploadRoomNumber.trim() ||
                                        !uploadBuildingName.trim() ||
                                        !uploadMonthlyRent ||
                                        isUploading
                                    }
                                >
                                    {isUploading ? t.contracts.btnUploading : t.contracts.btnUpload}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Contract Detail Modal ── */}
            {showDetailModal && selectedContract && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📄 {t.contracts.modalDetailTitle}</h2>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">

                            {/* ── Info Grid ── */}
                            <div className="detail-grid">

                                {/* Tenant Info */}
                                <div className="detail-section">
                                    <div className="detail-section-title">{t.contracts.sectionTenant}</div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelName}</div>
                                        <div className="detail-field-value">{selectedContract.person.name}</div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelEmail}</div>
                                        <div className={`detail-field-value${!selectedContract.person.email ? ' muted' : ''}`}>
                                            {selectedContract.person.email || t.contracts.noEmail}
                                        </div>
                                    </div>
                                </div>

                                {/* Room Info */}
                                <div className="detail-section">
                                    <div className="detail-section-title">{t.contracts.sectionRoom}</div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelRoomNo}</div>
                                        <div className="detail-field-value">{selectedContract.room.number}</div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelBuildingName}</div>
                                        <div className="detail-field-value">{selectedContract.room.building.name}</div>
                                    </div>
                                </div>

                                {/* Contract Info */}
                                <div className="detail-section">
                                    <div className="detail-section-title">{t.contracts.sectionContract}</div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelType}</div>
                                        <div className="detail-field-value">
                                            <span className={`badge ${typeBadge(selectedContract.type)}`}>
                                                {t.contracts.types[selectedContract.type as keyof typeof t.contracts.types] || selectedContract.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelStatus}</div>
                                        <div className="detail-field-value">
                                            <span className={`badge ${statusBadge(selectedContract.status)}`}>
                                                {t.contracts.statuses[selectedContract.status as keyof typeof t.contracts.statuses] || selectedContract.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelUploadDate}</div>
                                        <div className="detail-field-value">
                                            {formatDate(selectedContract.createdAt)}
                                        </div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelProductName}</div>
                                        <div className="detail-field-value">{selectedContract.productName || '—'}</div>
                                    </div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelProductArea}</div>
                                        <div className="detail-field-value">{selectedContract.productArea || '—'}</div>
                                    </div>
                                </div>

                                {/* Financial Info */}
                                <div className="detail-section">
                                    <div className="detail-section-title">{t.contracts.sectionFinancials}</div>
                                    <div className="detail-field">
                                        <div className="detail-field-label">{t.contracts.labelRentAmount}</div>
                                        <div className="detail-field-value" style={{ fontWeight: 700, fontSize: '1rem' }}>
                                            {formatCurrency(selectedContract.monthlyRent)}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* ── Attached Documents ── */}
                            <div>
                                <div className="detail-section-title" style={{ marginBottom: '12px' }}>
                                    📎 {t.contracts.labelMainDoc} ({selectedContract.documents.length})
                                </div>
                                {selectedContract.documents.length === 0 ? (
                                    <div style={{
                                        padding: '20px',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-card)',
                                        border: '1px dashed var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.875rem',
                                    }}>
                                        {t.contracts.labelNoDocs}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Main Contract Group */}
                                        {selectedContract.documents.filter(d => d.documentType === 'CONTRACT').map((doc) => (
                                            <Fragment key={doc.id}>
                                                <div className="doc-row">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                    <span style={{ fontSize: '1.25rem' }}>📄</span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', wordBreak: 'break-all' }}>{doc.originalName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {(doc.fileSize / (1024 * 1024)).toFixed(2)} {t.contracts.labelMB} · {t.contracts.labelUploaded} {formatDate(doc.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="doc-actions">
                                                    <span className={`badge ${approvalBadge(doc.approvalStatus)}`}>
                                                        {t.contracts.approvals[doc.approvalStatus as keyof typeof t.contracts.approvals] || doc.approvalStatus}
                                                    </span>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => {
                                                            setPreviewDocId(prev => prev === doc.id ? null : doc.id);
                                                        }}
                                                    >
                                                        {previewDocId === doc.id ? t.contracts.btnHidePreview : t.contracts.btnShowPreview}
                                                    </button>
                                                    <a
                                                        href={doc.fileUrl}
                                                        download={doc.originalName}
                                                        className="btn btn-sm btn-secondary"
                                                    >
                                                        {t.contracts.btnDownload}
                                                    </a>
                                                </div>
                                            </div>
                                            {previewDocId === doc.id && (
                                                <div className="pdf-preview-container" style={{ width: '100%', marginTop: '4px' }}>
                                                    <iframe
                                                        src={doc.fileUrl}
                                                        width="100%"
                                                        height="500"
                                                        style={{
                                                            border: "1px solid var(--border-subtle)",
                                                            borderRadius: "8px",
                                                            marginTop: "12px",
                                                            background: 'var(--bg-card)',
                                                        }}
                                                        title="PDF Preview"
                                                    />
                                                </div>
                                            )}
                                            </Fragment>
                                        ))}

                                        {/* Product Detail Group */}
                                        {selectedContract.documents.some(d => d.documentType === 'PRODUCT_DETAIL') && (
                                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '4px' }}>
                                                {t.contracts.labelProductDoc}
                                            </div>
                                        )}
                                        {selectedContract.documents.filter(d => d.documentType === 'PRODUCT_DETAIL').map((doc) => (
                                            <Fragment key={doc.id}>
                                                <div className="doc-row">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                    <span style={{ fontSize: '1.25rem' }}>📎</span>
                                                    <div style={{ minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', wordBreak: 'break-all' }}>{doc.originalName}</div>
                                                            <span className="badge amber" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                                                {t.contracts.labelProductDoc}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {(doc.fileSize / (1024 * 1024)).toFixed(2)} {t.contracts.labelMB} · {t.contracts.labelUploaded} {formatDate(doc.createdAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="doc-actions">
                                                    <span className={`badge ${approvalBadge(doc.approvalStatus)}`}>
                                                        {t.contracts.approvals[doc.approvalStatus as keyof typeof t.contracts.approvals] || doc.approvalStatus}
                                                    </span>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => {
                                                            setPreviewDocId(prev => prev === doc.id ? null : doc.id);
                                                        }}
                                                    >
                                                        {previewDocId === doc.id ? t.contracts.btnHidePreview : t.contracts.btnShowPreview}
                                                    </button>
                                                    <a
                                                        href={doc.fileUrl}
                                                        download={doc.originalName}
                                                        className="btn btn-sm btn-secondary"
                                                    >
                                                        {t.contracts.btnDownload}
                                                    </a>
                                                </div>
                                            </div>
                                            {previewDocId === doc.id && (
                                                <div className="pdf-preview-container" style={{ width: '100%', marginTop: '4px' }}>
                                                    <iframe
                                                        src={doc.fileUrl}
                                                        width="100%"
                                                        height="500"
                                                        style={{
                                                            border: "1px solid var(--border-subtle)",
                                                            borderRadius: "8px",
                                                            marginTop: "12px",
                                                            background: 'var(--bg-card)',
                                                        }}
                                                        title="PDF Preview"
                                                    />
                                                </div>
                                            )}
                                            </Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Footer ── */}
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); setPreviewDocId(null); }}>
                                {t.contracts.btnClose}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toastMsg && <div className="toast success">✅ {toastMsg}</div>}
        </>
    );
}
