import docx
import csv
from spellchecker import SpellChecker
import os
import re
import datetime  # Import pentru data și ora

def verificare_ortografie_docx(cale_fisier_docx, cale_fisier_csv, cale_dictionar=None):
    """
    Verifică greșelile de ortografie într-un document .docx în limba română
    și le salvează într-un fișier CSV cu detalii despre poziție.
    
    Parametri:
    ----------
    cale_fisier_docx : str
        Calea către fișierul Word (.docx) care va fi verificat
    cale_fisier_csv : str
        Calea unde va fi salvat fișierul CSV cu rezultate
    cale_dictionar : str, optional
        Calea către directorul care conține fișierele dicționarului românesc
    """
    # Verifică dacă fișierul .docx există
    if not os.path.exists(cale_fisier_docx):
        print(f"Eroare: Fișierul {cale_fisier_docx} nu există!")
        return
    
    print(f"Se verifică ortografia în documentul: {cale_fisier_docx}")
    
    # Inițializare verificator de ortografie
    spell = SpellChecker(language=None)  # Folosește None pentru a încărca un dicționar personalizat
    
    
    # Verifică dacă directorul dicționarului există
    if not os.path.exists(cale_dictionar):
        print(f"Eroare: Directorul dicționarului {cale_dictionar} nu există!")
        return
    
    # Încărcarea fișierelor de dicționar
    carti_dic = os.path.join(cale_dictionar, "ro.dic")
    carti_dia = os.path.join(cale_dictionar, "ro.dia")
    
    if not os.path.exists(carti_dic) or not os.path.exists(carti_dia):
        print(f"Eroare: Fișierele dicționarului nu au fost găsite în {cale_dictionar}")
        return
    
    print("Se încarcă dicționarul românesc...")
    spell.word_frequency.load_text_file(carti_dic)  # Dicționarul de bază
    spell.word_frequency.load_text_file(carti_dia)  # Dicționarul cu cuvinte cu cratimă
    
    try:
        # Citire document .docx
        print("Se deschide documentul Word...")
        doc = docx.Document(cale_fisier_docx)
    except Exception as e:
        print(f"Eroare la deschiderea documentului: {e}")
        return
    
    greseli = []
    numar_linie = 0
    
    print("Se analizează documentul pentru greșeli ortografice...")
    # Parcurgem paragrafele din document
    for paragraf in doc.paragraphs:
        numar_linie += 1
        text = paragraf.text.strip()
        
        if not text:  # Ignoră paragrafele goale
            continue
        
        # Extrage cuvintele folosind expresie regulată pentru a păstra doar cuvintele reale
        # (această abordare e mai bună decât simpla divizare după spații)
        words = re.findall(r'\b[\w\-\']+\b', text.lower())
        
        # Verifică textul pentru greșeli
        misspelled = spell.unknown(words)
        
        for word in misspelled:
            # Găsește pozițiile tuturor aparițiilor cuvântului în text
            for match in re.finditer(r'\b' + re.escape(word) + r'\b', text, re.IGNORECASE):
                pozitie = match.start()
                lungime = len(word)
                
                # Obține sugestii pentru corectare
                sugestii = spell.candidates(word)
                sugestii_text = ", ".join(list(sugestii)[:3]) if sugestii else "Nu există sugestii"
                
                # Creează context mai clar, evidențiind cuvântul greșit
                start_context = max(0, pozitie - 20)
                end_context = min(len(text), pozitie + lungime + 20)
                context_inainte = text[start_context:pozitie]
                context_dupa = text[pozitie + lungime:end_context]
                context = f"{context_inainte}[{text[pozitie:pozitie+lungime]}]{context_dupa}"
                
                greseala = {
                    'linie': numar_linie,
                    'pozitie': pozitie,
                    'cuvant_gresit': word,
                    'sugestii': sugestii_text,
                    'context': context,
                    'tip_eroare': "Greșeală ortografică"
                }
                greseli.append(greseala)
    
    # Sortăm greșelile după numărul liniei și poziție
    greseli.sort(key=lambda x: (x['linie'], x['pozitie']))
    
    # Obține data și ora curentă în format românesc
    data_curenta = datetime.datetime.now()
    data_formatata = data_curenta.strftime("%d.%m.%Y, %H:%M")
    
    # Salvăm greșelile în fișierul CSV cu metadata în primul rând
    try:
        with open(cale_fisier_csv, 'w', newline='', encoding='utf-8') as fisier_csv:
            # Prima linie conține metadata
            fisier_csv.write(f"#DATA_CREARE:{data_formatata}\n")
            
            # Scrie datele propriu-zise
            writer = csv.DictWriter(fisier_csv, 
                                  fieldnames=['linie', 'pozitie', 'cuvant_gresit', 'sugestii', 'context', 'tip_eroare'])
            writer.writeheader()
            writer.writerows(greseli)
        print(f"Rezultatele au fost salvate în {cale_fisier_csv}")
    except Exception as e:
        print(f"Eroare la salvarea rezultatelor: {e}")
        return
    
    # Raport final
    if len(greseli) > 0:
        print(f"Verificarea s-a încheiat. S-au găsit {len(greseli)} greșeli de ortografie.")
    else:
        print("Verificarea s-a încheiat. Nu s-au găsit greșeli de ortografie!")


if __name__ == "__main__":
    # Exemplu de utilizare:
    cale_docx = "fisa.docx"
    cale_csv = "static/greseli.csv"
    
    # Poți specifica calea către dicționar sau o lăsa goală pentru a folosi calea implicită
    cale_dictionar = r"romanian_spelling_dictionary"
    
    verificare_ortografie_docx(cale_docx, cale_csv, cale_dictionar)

