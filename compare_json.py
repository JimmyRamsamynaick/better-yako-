import json
import os

def get_all_keys(d, parent_key=''):
    """
    Recursively get all keys from a nested dictionary.
    """
    keys = set()
    for k, v in d.items():
        new_key = f"{parent_key}.{k}" if parent_key else k
        keys.add(new_key)
        if isinstance(v, dict):
            keys.update(get_all_keys(v, new_key))
    return keys

try:
    # Correctly specify the absolute path to the files
    base_path = 'c:\\Users\\jimmy\\Downloads\\better-yako\\better-yako-'
    en_path = os.path.join(base_path, 'languages', 'en.json')
    fr_path = os.path.join(base_path, 'languages', 'fr.json')

    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)

    with open(fr_path, 'r', encoding='utf-8') as f:
        fr_data = json.load(f)

    en_keys = get_all_keys(en_data)
    fr_keys = get_all_keys(fr_data)

    missing_in_fr = en_keys - fr_keys
    missing_in_en = fr_keys - en_keys

    if missing_in_fr:
        print("Keys missing in fr.json:")
        for key in sorted(list(missing_in_fr)):
            print(key)

    if missing_in_en:
        print("\nKeys missing in en.json:")
        for key in sorted(list(missing_in_en)):
            print(key)

    if not missing_in_fr and not missing_in_en:
        print("Both files have the same keys.")

except FileNotFoundError as e:
    print(f"Error: {e}. Please check the file paths.")
except json.JSONDecodeError as e:
    print(f"Error decoding JSON: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")