import fs from 'fs';

const normDataCode = `
function normalizarData(val) {
    if (!val && val !== 0) return null;
    if (typeof val === 'number' && val > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(val);
            if (d) return \`\${String(d.d).padStart(2,'0')}/\${String(d.m).padStart(2,'0')}/\${d.y}\`;
        } catch (_) {}
    }
    const s = String(val).trim();
    if (!s) return null;
    const m1 = s.match(/^(\\d{1,2})[/\\-.](\\d{1,2})[/\\-.](\\d{2,4})$/);
    if (m1) {
        const [, d, mo, y] = m1;
        const year = y.length === 2 ? \`20\${y}\` : y;
        return \`\${d.padStart(2,'0')}/\${mo.padStart(2,'0')}/\${year}\`;
    }
    const num = Number(s);
    if (!isNaN(num) && num > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(num);
            if (d) return \`\${String(d.d).padStart(2,'0')}/\${String(d.m).padStart(2,'0')}/\${d.y}\`;
        } catch (_) {}
    }
    return s;
}
`;

function patchFile(file, isRazao) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add normalizarData at the end
    if (!content.includes('function normalizarData(')) {
        content += normDataCode;
    }
    
    // Replace dataStr = String(...) with dataStr = normalizarData(row[...])
    if (isRazao) {
        content = content.replace(/dataStr = String\(row\[1\] \?\? ''\)\.trim\(\);/g, "dataStr = normalizarData(row[1]) || '';");
        content = content.replace(/dataStr = String\(row\[4\] \?\? ''\)\.trim\(\);/g, "dataStr = normalizarData(row[4]) || '';");
    } else {
        content = content.replace(/dataStr = String\(row\[1\] \?\? ''\)\.trim\(\);/g, "dataStr = normalizarData(row[1]) || '';");
        content = content.replace(/dataStr = String\(row\[4\] \?\? ''\)\.trim\(\);/g, "dataStr = normalizarData(row[4]) || '';");
    }
    
    fs.writeFileSync(file, content);
    console.log('Patched ' + file);
}

patchFile('src/lib/banco-razao/razao-banco-parser.js', true);
patchFile('src/lib/banco-razao/saldo-conta-parser.js', false);
