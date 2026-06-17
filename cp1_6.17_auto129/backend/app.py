import os
import io
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def try_read_csv(file_stream):
    content = file_stream.read()
    for enc in ['utf-8', 'utf-8-sig', 'gbk', 'gb2312', 'latin-1']:
        try:
            text = content.decode(enc)
            df = pd.read_csv(io.StringIO(text))
            return df
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue
    raise ValueError("Unable to decode CSV file with supported encodings (UTF-8, GBK)")


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400
    try:
        df = try_read_csv(f)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    df = df.fillna('')
    columns = df.columns.tolist()
    rows = df.to_dict(orient='records')
    for row in rows:
        for k, v in row.items():
            if isinstance(v, (np.integer,)):
                row[k] = int(v)
            elif isinstance(v, (np.floating,)):
                row[k] = float(v)
            elif pd.isna(v):
                row[k] = ''
            else:
                row[k] = str(v) if not isinstance(v, (int, float)) else v
    path = os.path.join(UPLOAD_FOLDER, 'latest.csv')
    df.to_csv(path, index=False)
    return jsonify({
        'columns': columns,
        'rows': rows,
        'totalRows': len(rows),
    })


@app.route('/pivot', methods=['POST'])
def pivot():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    rows = data.get('data', [])
    config = data.get('config', {})
    row_fields = config.get('rowFields', [])
    col_fields = config.get('colFields', [])
    value_fields = config.get('valueFields', [])
    if not rows or not value_fields:
        return jsonify({'headers': [], 'rows': []})
    df = pd.DataFrame(rows)
    for vf in value_fields:
        field = vf['field']
        if field in df.columns:
            df[field] = pd.to_numeric(df[field], errors='coerce')
    agg_map = {
        'sum': 'sum',
        'avg': 'mean',
        'count': 'count',
        'max': 'max',
        'min': 'min',
        'std': 'std',
    }
    group_keys = row_fields + col_fields
    if not group_keys:
        result_rows = []
        headers = ['指标']
        for vf in value_fields:
            field = vf['field']
            agg = vf.get('agg', 'sum')
            fn = agg_map.get(agg, 'sum')
            col_name = f"{field}({agg})"
            headers.append(col_name)
            val = df[field].agg(fn)
            if pd.isna(val):
                val = 0
            result_rows.append({'指标': col_name, col_name: round(float(val), 4) if isinstance(val, float) else val})
        return jsonify({'headers': headers, 'rows': result_rows})
    agg_dict = {}
    for vf in value_fields:
        field = vf['field']
        agg = vf.get('agg', 'sum')
        fn = agg_map.get(agg, 'sum')
        col_name = f"{field}({agg})"
        if field not in agg_dict:
            agg_dict[field] = {}
        agg_dict[field][col_name] = fn
    try:
        grouped = df.groupby(group_keys, dropna=False)
        agg_results = {}
        for field, funcs in agg_dict.items():
            agg_results.update(grouped[field].agg(funcs).to_dict())
        result_df = grouped.size().reset_index(name='_count')
        for key, values in agg_results.items():
            if isinstance(values, dict):
                for sub_key, series in values.items():
                    result_df[sub_key] = result_df[group_keys[0]].map(
                        lambda x, s=series, gk=group_keys: s.get(tuple(
                            result_df.loc[result_df.index[s.index.get_loc(x) if x in s.index else -1], gk].values
                        ) if len(gk) == 1 else x, 0) if len(gk) == 1 else 0
                    )
            else:
                result_df[key] = result_df[group_keys[0]].map(values)
        pivot_df = df.pivot_table(
            index=row_fields if row_fields else None,
            columns=col_fields if col_fields else None,
            values=[vf['field'] for vf in value_fields],
            aggfunc=[agg_map.get(vf.get('agg', 'sum'), 'sum') for vf in value_fields],
            fill_value=0,
        )
        pivot_df = pivot_df.reset_index()
        pivot_df.columns = [
            '_'.join(str(c) for c in col).strip('_') if isinstance(col, tuple) else str(col)
            for col in pivot_df.columns
        ]
        headers = pivot_df.columns.tolist()
        result_rows = pivot_df.to_dict(orient='records')
    except Exception:
        grouped = df.groupby(group_keys, dropna=False)
        agg_cols = []
        for vf in value_fields:
            field = vf['field']
            agg = vf.get('agg', 'sum')
            fn = agg_map.get(agg, 'sum')
            col_name = f"{field}_{agg}"
            agg_cols.append(col_name)
            grouped = grouped.agg(**{col_name: pd.NamedAgg(column=field, aggfunc=fn)})
        pivot_df = grouped.reset_index()
        for col in agg_cols:
            if pivot_df[col].dtype in ['float64', 'float32']:
                pivot_df[col] = pivot_df[col].round(4)
        headers = pivot_df.columns.tolist()
        result_rows = pivot_df.to_dict(orient='records')
    for row in result_rows:
        for k, v in row.items():
            if isinstance(v, (np.integer,)):
                row[k] = int(v)
            elif isinstance(v, (np.floating,)):
                row[k] = round(float(v), 4)
            elif pd.isna(v):
                row[k] = ''
            else:
                row[k] = str(v) if not isinstance(v, (int, float)) else v
    return jsonify({'headers': headers, 'rows': result_rows})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
