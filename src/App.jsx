import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Settings, Sun, Moon, Search, X, Download, Upload } from 'lucide-react';

const DiaryApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState({});
  const [fieldTitles, setFieldTitles] = useState(['Feld 1', 'Feld 2', 'Feld 3']);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditingTitles, setIsEditingTitles] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [fuzzySearchEnabled, setFuzzySearchEnabled] = useState(true);
  const fileInputRef = useRef(null);

  // Auto-save timeout - no sample data
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Get current entry for the selected date
  const getCurrentEntry = () => {
    const dateKey = formatDate(currentDate);
    return entries[dateKey] || { field1: '', field2: '', field3: '', mood: null };
  };

  // Update entry with auto-save
  const updateEntry = (field, value) => {
    const dateKey = formatDate(currentDate);
    const newEntries = {
      ...entries,
      [dateKey]: {
        ...getCurrentEntry(),
        [field]: value
      }
    };
    setEntries(newEntries);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      // Here you would normally save to backend
      console.log('Auto-saved entry for', dateKey);
    }, 1000);
    setSaveTimeout(timeout);
  };

  // Update mood score
  const updateMood = (moodValue) => {
    updateEntry('mood', moodValue);
  };

  // Levenshtein distance algorithm for fuzzy matching
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Check if two words are similar (fuzzy match)
  const isFuzzyMatch = (searchTerm, text) => {
    if (!fuzzySearchEnabled) {
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    }

    const words = text.toLowerCase().split(/\s+/);
    const searchTermLower = searchTerm.toLowerCase();
    
    // First check for exact matches
    if (text.toLowerCase().includes(searchTermLower)) {
      return true;
    }
    
    // Then check for fuzzy matches
    for (const word of words) {
      // Skip very short words for fuzzy matching
      if (word.length < 3 || searchTermLower.length < 3) continue;
      
      const distance = levenshteinDistance(searchTermLower, word);
      const maxDistance = Math.floor(Math.max(searchTermLower.length, word.length) * 0.3); // Allow 30% difference
      
      if (distance <= maxDistance && distance <= 2) { // Max 2 character difference
        return true;
      }
    }
    
    return false;
  };

  // Get mood emoji and label
  const getMoodDisplay = (mood) => {
    switch(mood) {
      case 1: return { emoji: '😔', label: 'Schlecht', color: 'text-red-500' };
      case 2: return { emoji: '😐', label: 'Normal', color: 'text-yellow-500' };
      case 3: return { emoji: '😊', label: 'Gut', color: 'text-green-500' };
      default: return { emoji: '❓', label: 'Nicht bewertet', color: 'text-gray-400' };
    }
  };

  // Search through all entries
  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [];
    const searchTerm = query.toLowerCase();

    Object.entries(entries).forEach(([dateKey, entry]) => {
      const matchingFields = [];
      
      // Check each field for matches
      fieldTitles.forEach((title, index) => {
        const fieldValue = entry[`field${index + 1}`] || '';
        if (isFuzzyMatch(searchTerm, fieldValue)) {
          // Find the context around the match
          let context = '';
          if (fuzzySearchEnabled && !fieldValue.toLowerCase().includes(searchTerm)) {
            // For fuzzy matches, show more context
            context = fieldValue.length > 60 ? fieldValue.substring(0, 60) + '...' : fieldValue;
          } else {
            // For exact matches, show context around the match
            const matchIndex = fieldValue.toLowerCase().indexOf(searchTerm);
            const start = Math.max(0, matchIndex - 30);
            const end = Math.min(fieldValue.length, matchIndex + searchTerm.length + 30);
            context = fieldValue.substring(start, end);
            
            if (start > 0) context = '...' + context;
            if (end < fieldValue.length) context = context + '...';
          }
          
          matchingFields.push({
            title,
            context,
            fullText: fieldValue,
            isFuzzy: fuzzySearchEnabled && !fieldValue.toLowerCase().includes(searchTerm)
          });
        }
      });

      // Check for mood-based searches
      const moodSearches = {
        'schlecht': 1, 'traurig': 1, 'down': 1,
        'normal': 2, 'okay': 2, 'ok': 2,
        'gut': 3, 'super': 3, 'toll': 3, 'großartig': 3
      };
      
      if (moodSearches[searchTerm] && entry.mood === moodSearches[searchTerm]) {
        const moodDisplay = getMoodDisplay(entry.mood);
        matchingFields.push({
          title: 'Stimmung',
          context: `${moodDisplay.emoji} ${moodDisplay.label}`,
          fullText: moodDisplay.label,
          isFuzzy: false
        });
      }

      if (matchingFields.length > 0) {
        results.push({
          date: dateKey,
          displayDate: new Date(dateKey + 'T00:00:00').toLocaleDateString('de-DE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          matches: matchingFields,
          mood: entry.mood
        });
      }
    });

    // Sort results by date (newest first)
    results.sort((a, b) => new Date(b.date) - new Date(a.date));
    setSearchResults(results);
  };

  // Handle search input
  const handleSearch = (query) => {
    setSearchQuery(query);
    performSearch(query);
  };

  // Navigate to a specific date from search results
  const goToDate = (dateString) => {
    setCurrentDate(new Date(dateString + 'T00:00:00'));
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Excel Export Function
  const exportToExcel = () => {
    const csvContent = [
      ['Datum', fieldTitles[0], fieldTitles[1], fieldTitles[2], 'Stimmung'],
      ...Object.entries(entries)
        .sort(([a], [b]) => new Date(a) - new Date(b)) // Sort by date
        .map(([date, entry]) => [
          date,
          entry.field1 || '',
          entry.field2 || '',
          entry.field3 || '',
          entry.mood || ''
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tagebuch_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Import Function with automatic field title detection and German date support
  const importFromExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('Die Excel-Datei scheint leer oder ungültig zu sein.');
          return;
        }

        // Parse CSV manually
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        // Parse date in multiple formats
        const parseDate = (dateString) => {
          if (!dateString) return null;
          
          const cleaned = dateString.replace(/"/g, '').trim();
          
          // Try ISO format first (YYYY-MM-DD)
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
            return cleaned;
          }
          
          // Try German format (DD.MM.YYYY or DD/MM/YYYY)
          const germanMatch = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
          if (germanMatch) {
            const day = germanMatch[1].padStart(2, '0');
            const month = germanMatch[2].padStart(2, '0');
            const year = germanMatch[3];
            return `${year}-${month}-${day}`;
          }
          
          // Try to parse as Excel date number
          const excelDate = parseFloat(cleaned);
          if (!isNaN(excelDate) && excelDate > 1) {
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
            return jsDate.toISOString().split('T')[0];
          }
          
          return null;
        };

        const headerRow = parseCSVLine(lines[0]).map(h => h.replace(/"/g, ''));
        const dataLines = lines.slice(1);
        
        // Extract field titles from header (skip first column "Datum" and last column "Stimmung")
        if (headerRow.length >= 4) {
          const newFieldTitles = [
            headerRow[1] || 'Feld 1', // Second column
            headerRow[2] || 'Feld 2', // Third column  
            headerRow[3] || 'Feld 3'  // Fourth column
          ];
          setFieldTitles(newFieldTitles);
        }
        
        let importCount = 0;
        let skippedCount = 0;
        const newEntries = { ...entries };

        dataLines.forEach((line, lineIndex) => {
          const values = parseCSVLine(line).map(v => v.replace(/"/g, ''));
          
          if (values.length >= 4) {
            const parsedDate = parseDate(values[0]);
            
            if (parsedDate) {
              // Only add if entry doesn't exist (no overwriting)
              if (!newEntries[parsedDate]) {
                newEntries[parsedDate] = {
                  field1: values[1] || '',
                  field2: values[2] || '',
                  field3: values[3] || '',
                  mood: values[4] && !isNaN(values[4]) ? parseInt(values[4]) : null
                };
                importCount++;
              }
            } else {
              skippedCount++;
              console.log(`Skipped line ${lineIndex + 2}: Invalid date format "${values[0]}"`);
            }
          }
        });

        setEntries(newEntries);
        
        let message = `${importCount} Einträge erfolgreich importiert!`;
        if (headerRow.length >= 4) {
          message += `\n\nFeldnamen wurden automatisch übernommen:\n• ${fieldTitles[0]} → ${headerRow[1] || 'Feld 1'}\n• ${fieldTitles[1]} → ${headerRow[2] || 'Feld 2'}\n• ${fieldTitles[2]} → ${headerRow[3] || 'Feld 3'}`;
        }
        if (skippedCount > 0) {
          message += `\n\n${skippedCount} Zeilen übersprungen (ungültiges Datumsformat)`;
        }
        
        alert(message);
        
      } catch (error) {
        console.error('Import error:', error);
        alert('Fehler beim Importieren der Datei. Bitte überprüfe das Format.');
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = ''; // Reset file input
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const currentEntry = getCurrentEntry();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <h1 className="text-xl font-semibold">Tagebuch</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between p-4 pt-0">
          <button
            onClick={goToPreviousDay}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatDisplayDate(currentDate)}
            </span>
          </button>

          <button
            onClick={goToNextDay}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`p-4 border-b transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Einstellungen</h3>
              <button
                onClick={() => setIsEditingTitles(!isEditingTitles)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isEditingTitles ? 'Fertig' : 'Felder bearbeiten'}
              </button>
            </div>

            {/* Excel Import/Export */}
            <div className="space-y-3">
              <h4 className="text-md font-medium">Daten verwalten</h4>
              <div className="flex space-x-3">
                <button
                  onClick={exportToExcel}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    isDarkMode
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Excel Export</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Excel Import</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={importFromExcel}
                  style={{ display: 'none' }}
                />
              </div>
              <p className="text-xs opacity-60">
                Export: Lädt alle Einträge als CSV-Datei herunter<br/>
                Import: Fügt neue Einträge hinzu (überschreibt keine bestehenden)<br/>
                Die Spaltennamen werden automatisch aus der Excel-Datei übernommen
              </p>
            </div>
            
            {isEditingTitles && (
              <div className="space-y-3">
                <p className="text-sm opacity-70">Titel der drei Eingabefelder:</p>
                {fieldTitles.map((title, index) => (
                  <input
                    key={index}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const newTitles = [...fieldTitles];
                      newTitles[index] = e.target.value;
                      setFieldTitles(newTitles);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder={`Feld ${index + 1} Titel`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      {showCalendar && (
        <div className={`p-4 border-b transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <input
            type="date"
            value={formatDate(currentDate)}
            onChange={(e) => {
              setCurrentDate(new Date(e.target.value + 'T00:00:00'));
              setShowCalendar(false);
            }}
            className={`w-full px-3 py-2 rounded-lg border transition-colors ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className={`border-b transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Durchsuche alle Einträge..."
                className={`w-full pl-10 pr-10 py-3 rounded-xl border-0 transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Fuzzy Search Toggle */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-sm opacity-70">Schreibfehler tolerieren</span>
                <div className="text-xs opacity-50">
                  {fuzzySearchEnabled ? '(z.B. "fahrd" → "fahrrad")' : '(nur exakte Treffer)'}
                </div>
              </div>
              <button
                onClick={() => {
                  setFuzzySearchEnabled(!fuzzySearchEnabled);
                  if (searchQuery) {
                    // Re-run search with new setting
                    setTimeout(() => performSearch(searchQuery), 100);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  fuzzySearchEnabled
                    ? 'bg-blue-500'
                    : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    fuzzySearchEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto space-y-3">
                <p className="text-sm opacity-70">
                  {searchResults.length} Ergebnis{searchResults.length > 1 ? 'se' : ''} gefunden
                  {fuzzySearchEnabled && ' (inkl. ähnliche Wörter)'}
                </p>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => goToDate(result.date)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-500">
                          {result.displayDate}
                        </span>
                        {result.mood && (
                          <span className="text-sm">
                            {getMoodDisplay(result.mood).emoji}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.matches.some(m => m.isFuzzy) && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                            ähnlich
                          </span>
                        )}
                        <span className="text-xs opacity-50">
                          {result.matches.length} Treffer
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {result.matches.map((match, matchIndex) => (
                        <div key={matchIndex} className="text-sm">
                          <span className="font-medium opacity-70">
                            {match.title}:
                          </span>
                          <span className={`ml-2 ${match.isFuzzy ? 'opacity-75' : 'opacity-90'}`}>
                            {match.context}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-4 text-center py-4">
                <p className="text-sm opacity-50">
                  Keine Einträge gefunden für "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-6 pb-8">
        {/* Mood Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-medium opacity-70">
            Wie war dein Tag?
          </label>
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((moodValue) => {
              const moodDisplay = getMoodDisplay(moodValue);
              const isSelected = currentEntry.mood === moodValue;
              return (
                <button
                  key={moodValue}
                  onClick={() => updateMood(moodValue)}
                  className={`flex-1 p-4 mx-1 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-blue-600 shadow-lg transform scale-105'
                        : 'bg-blue-500 shadow-lg transform scale-105'
                      : isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{moodDisplay.emoji}</div>
                    <div className={`text-xs font-medium ${
                      isSelected ? 'text-white' : moodDisplay.color
                    }`}>
                      {moodDisplay.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {fieldTitles.map((title, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium opacity-70">
              {title}
            </label>
            <textarea
              value={currentEntry[`field${index + 1}`]}
              onChange={(e) => updateEntry(`field${index + 1}`, e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border-0 resize-none transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-800 text-white placeholder-gray-400 focus:bg-gray-750'
                  : 'bg-white text-gray-900 placeholder-gray-500 focus:bg-gray-50'
              } shadow-sm focus:shadow-md focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              placeholder={`Deine ${title.toLowerCase()} für heute...`}
            />
          </div>
        ))}

        {/* Save Indicator */}
        <div className="text-center">
          <p className="text-xs opacity-50">
            Einträge werden automatisch gespeichert
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiaryApp;
