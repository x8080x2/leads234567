interface CsvContact {
  firstName: string;
  lastName: string;
  company: string;
}

export function parseCsvFile(file: File): Promise<CsvContact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        
        if (lines.length < 2) {
          reject(new Error('CSV file must contain at least a header row and one data row'));
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find required columns
        const firstNameIndex = headers.findIndex(h => 
          h.includes('first') && h.includes('name') || h === 'firstname'
        );
        const lastNameIndex = headers.findIndex(h => 
          h.includes('last') && h.includes('name') || h === 'lastname'
        );
        const companyIndex = headers.findIndex(h => 
          h.includes('company') || h.includes('organization') || h === 'org'
        );

        if (firstNameIndex === -1 || lastNameIndex === -1 || companyIndex === -1) {
          reject(new Error('CSV must contain first_name, last_name, and company columns'));
          return;
        }

        // Parse data rows
        const contacts: CsvContact[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines
          
          const values = line.split(',').map(v => v.trim().replace(/^"/, '').replace(/"$/, ''));
          
          if (values.length <= Math.max(firstNameIndex, lastNameIndex, companyIndex)) {
            continue; // Skip invalid rows
          }

          const contact: CsvContact = {
            firstName: values[firstNameIndex],
            lastName: values[lastNameIndex],
            company: values[companyIndex],
          };

          if (contact.firstName && contact.lastName && contact.company) {
            contacts.push(contact);
          }
        }

        if (contacts.length === 0) {
          reject(new Error('No valid contacts found in CSV file'));
          return;
        }

        resolve(contacts);
      } catch (error) {
        reject(new Error('Failed to parse CSV file: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export function exportToCsv(data: any[], filename: string) {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
