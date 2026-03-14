const fs = require('fs');
const path = require('path');

try {
    const data = JSON.parse(fs.readFileSync('lint_results.json', 'utf8'));
    const errors = data.filter(d => d.errorCount > 0);

    let md = '# Codebase Audit Report\n\n## Syntax & Logical Errors Found\n\n';

    if (errors.length === 0) {
        md += 'No critical errors found!\n';
    } else {
        errors.forEach(file => {
            const relativePath = path.relative(process.cwd(), file.filePath);
            md += `### ${relativePath}\n`;
            file.messages.filter(m => m.severity === 2).forEach(msg => {
                md += `- **Line ${msg.line}:${msg.column}**: ${msg.message} (Rule: \`${msg.ruleId || 'syntax'}\`)\n`;
            });
            md += '\n';
        });
    }

    const outputPath = path.join(process.cwd(), 'audit_report.md');
    fs.writeFileSync(outputPath, md);
    console.log(`Report generated at ${outputPath}`);
} catch (err) {
    console.error('Error generating report:', err);
}
