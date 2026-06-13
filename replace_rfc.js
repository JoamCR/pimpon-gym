const fs = require('fs');
const file = 'frontend/src/pages/Patients.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/(\s+email: '',)(\r?\n\s+)(rfc: '',)(\r?\n\s+occupation: '',)/, '$1$2// $3$4');
content = content.replace(/(\s+phone: '',)(\r?\n\s+)(rfc: '',)(\r?\n\s+occupation: '',)/, '$1$2// $3$4');
content = content.replace(/(\s+if \(!payload.email\) delete payload.email;)(\r?\n\s+)(if \(!payload.rfc\) delete payload.rfc;)/, '$1$2// $3');
content = content.replace(/(\s+\} else if \(msg\.includes\('RFC'\)\) \{\r?\n\s+setFieldErrors\(\{ rfc: msg \}\);\r?\n\s+setStep\(1\);\r?\n\s+\} else \{)/, (match) => match.replace('} else if', '} /* else if').replace('} else {', '} */ else {'));
content = content.replace(/(\s+\{ label: 'Teléfono', key: 'phone' \},)(\r?\n\s+)(\{ label: 'RFC', key: 'rfc' \},)/, '$1$2// $3');
content = content.replace(/(\s+onBlur=\{async \(e\) => \{\r?\n\s+)(if \(\(field.key === 'phone' \|\| field.key === 'rfc'\) && e\.target\.value\) \{)/, '$1// $2\n                    if (field.key === \'phone\' && e.target.value) {');

fs.writeFileSync(file, content);
console.log("Done");