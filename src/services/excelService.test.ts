import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelImportBuffer } from './excelService';

describe('excelService', () => {
  it('parses Thai template rows and groups multiple sub-items under the same loan', () => {
    const rows = [
      {
        'ชื่อรายการสินเชื่อ *': 'สินเชื่อกสิกร Xpress Loan',
        'รหัสหรือชื่อผู้ให้บริการ': 'kbank',
        'เลขที่สัญญา': 'KB-2026-001',
        'ประเภทสินเชื่อ': 'แบ่งจ่ายหลายรอบ',
        'วงเงินกู้ตั้งต้น (บาท)': 120000,
        'ยอดหนี้คงเหลือรวม (บาท)': 85000,
        'อัตราดอกเบี้ยต่อปี (%)': 15.5,
        'จำนวนงวดทั้งหมด': 36,
        'ชื่องวดชำระย่อย': 'งวดครึ่งเดือนแรก',
        'วันครบกำหนด (1-31) *': 15,
        'เวลาแจ้งเตือน (HH:mm)': '12:00',
        'ยอดที่ต้องชำระต่องวด (บาท) *': 3200,
        'หมายเหตุ': 'ตัดบัญชีอัตโนมัติ',
      },
      {
        'ชื่อรายการสินเชื่อ *': 'สินเชื่อกสิกร Xpress Loan',
        'รหัสหรือชื่อผู้ให้บริการ': 'kbank',
        'เลขที่สัญญา': 'KB-2026-001',
        'ประเภทสินเชื่อ': 'แบ่งจ่ายหลายรอบ',
        'วงเงินกู้ตั้งต้น (บาท)': 120000,
        'ยอดหนี้คงเหลือรวม (บาท)': 85000,
        'อัตราดอกเบี้ยต่อปี (%)': 15.5,
        'จำนวนงวดทั้งหมด': 36,
        'ชื่องวดชำระย่อย': 'งวดสิ้นเดือน',
        'วันครบกำหนด (1-31) *': 28,
        'เวลาแจ้งเตือน (HH:mm)': '18:00',
        'ยอดที่ต้องชำระต่องวด (บาท) *': 3200,
        'หมายเหตุ': 'ตัดบัญชีอัตโนมัติ',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'นำเข้าสินเชื่อ');

    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const result = parseExcelImportBuffer(out);

    expect(result.errors).toEqual([]);
    expect(result.rowCount).toBe(2);
    expect(result.loans).toHaveLength(1);

    const loan = result.loans[0];
    expect(loan.lenderId).toBe('kbank');
    expect(loan.totalPrincipal).toBe(120000);
    expect(loan.remainingPrincipal).toBe(85000);
    expect(loan.interestRateAnnual).toBe(15.5);
    expect(loan.totalInstallments).toBe(36);
    expect(loan.subItems).toHaveLength(2);
    expect(loan.subItems[0].amount).toBe(3200);
    expect(loan.subItems[1].dueDayOfMonth).toBe(28);
  });
});
