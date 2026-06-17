import math


def hex_distance(a, b):
    return (
        abs(a['q'] - b['q']) +
        abs(a['q'] + a['r'] - b['q'] - b['r']) +
        abs(a['r'] - b['r'])
    ) / 2


def hex_to_pixel(q, r, size):
    x = size * (3 / 2) * q
    y = size * (math.sqrt(3) / 2 * q + math.sqrt(3) * r)
    return {'x': x, 'y': y}


def pixel_to_hex(x, y, size):
    q = (2 / 3 * x) / size
    r = (-1 / 3 * x + math.sqrt(3) / 3 * y) / size
    return hex_round(q, r)


def hex_round(q, r):
    s = -q - r
    rq = round(q)
    rr = round(r)
    rs = round(s)

    q_diff = abs(rq - q)
    r_diff = abs(rr - r)
    s_diff = abs(rs - s)

    if q_diff > r_diff and q_diff > s_diff:
        rq = -rr - rs
    elif r_diff > s_diff:
        rr = -rq - rs

    return {'q': rq, 'r': rr}


def get_hex_neighbors(q, r):
    directions = [
        {'q': 1, 'r': 0},
        {'q': 1, 'r': -1},
        {'q': 0, 'r': -1},
        {'q': -1, 'r': 0},
        {'q': -1, 'r': 1},
        {'q': 0, 'r': 1},
    ]
    return [{'q': q + d['q'], 'r': r + d['r']} for d in directions]


def coord_key(q, r):
    return f"{q},{r}"
