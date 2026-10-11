import { db } from './db.js'

const LG = [
  ['Бронза', '🥉', '#d08b5b', 100],
  ['Серебро', '🥈', '#c3cbd8', 150],
  ['Золото', '🥇', '#ffd43b', 220],
  ['Платина', '💠', '#4fd6c8', 300],
  ['Алмаз', '💎', '#6f8cff', 400],
  ['Легенда', '👑', '#ff5fa2', 600]
]

const TS = [
[0, 'Переменные и print', 'Первые шаги: переменные, f-строки и вывод на экран.', 1, 10, 85, 15, 20, `name = "Alex"
age = 21
height = 1.78
is_student = True

print(name, age)
print(f"{name} is {age} years old")
print("Height:", height, "m")
print(type(height), type(is_student))`],
[0, 'Списки и циклы', 'Списки, for, enumerate и остаток от деления.', 1, 12, 85, 15, 20, `nums = [4, 8, 15, 16, 23, 42]
total = 0

for n in nums:
    total += n

print("sum:", total)
print("max:", max(nums), "min:", min(nums))

nums.append(108)
nums.remove(4)
print(nums[0], nums[-1], len(nums))

for i, n in enumerate(nums):
    if n % 2 == 0:
        print(i, n)`],
[0, 'Условия', 'if, elif, else и тернарный оператор.', 1, 12, 85, 15, 20, `def grade(score):
    if score >= 90:
        return "A"
    elif score >= 75:
        return "B"
    elif score >= 60:
        return "C"
    else:
        return "F"


for s in [95, 80, 61, 42]:
    print(s, grade(s))

x = 7
kind = "even" if x % 2 == 0 else "odd"
print(x, kind)`],
[1, 'Словари', 'Словари, items, get и подсчёт слов.', 2, 15, 88, 20, 30, `stock = {"apple": 12, "banana": 5, "kiwi": 0}

stock["mango"] = 7
stock["banana"] += 3

for fruit, qty in stock.items():
    status = "ok" if qty > 0 else "empty"
    print(f"{fruit:<8} {qty:>3}  {status}")

print("kiwi" in stock)
print(stock.get("pear", 0))

words = "the cat and the dog and the bird".split()
count = {}
for w in words:
    count[w] = count.get(w, 0) + 1
print(sorted(count.items(), key=lambda kv: -kv[1]))`],
[1, 'Функции и аргументы', 'Аргументы по умолчанию, *args и **kwargs.', 2, 15, 88, 20, 30, `def area(w, h=None):
    if h is None:
        h = w
    return w * h


def stats(*nums, round_to=2):
    avg = sum(nums) / len(nums)
    return min(nums), max(nums), round(avg, round_to)


def greet(**info):
    parts = [f"{k}={v}" for k, v in info.items()]
    return ", ".join(parts)


print(area(5), area(3, 4))
lo, hi, avg = stats(3, 9, 4, 7)
print(lo, hi, avg)
print(greet(name="Sam", lang="python"))`],
[1, 'Comprehensions', 'Генераторы списков, словарей и множеств.', 2, 16, 88, 20, 30, `nums = range(1, 21)

squares = [n * n for n in nums]
evens = [n for n in nums if n % 2 == 0]
pairs = [(a, b) for a in range(3) for b in range(3) if a != b]
lengths = {w: len(w) for w in ["code", "fast", "python"]}
unique = {n % 5 for n in nums}

print(squares[:5])
print(evens)
print(pairs)
print(lengths)
print(unique)

matrix = [[i * j for j in range(1, 4)] for i in range(1, 4)]
flat = [x for row in matrix for x in row]
print(flat)`],
[2, 'Строки', 'Методы строк, срезы и форматирование.', 2, 20, 90, 30, 40, `text = "  Python is fast to write and fun to read  "

clean = text.strip()
print(clean.upper())
print(clean.lower().replace("fun", "easy"))
print(clean.split()[:3])
print(len(clean), clean.count("o"))
print(clean.startswith("Python"), clean.endswith("!"))

word = "racecar"
print(word == word[::-1])

title = " ".join(w.capitalize() for w in "hello big world".split())
print(title)
print("-".join(["2026", "10", "11"]))
print(f"{3.14159:.2f} | {42:05d} | {'hi':^10}|")`],
[2, 'Классы', 'Класс, __init__, методы и __repr__.', 2, 20, 90, 30, 40, `class Account:
    rate = 0.05

    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
        return self.balance

    def add_interest(self):
        self.balance *= 1 + self.rate

    def __repr__(self):
        return f"Account({self.owner!r}, {self.balance:.2f})"


acc = Account("Lena", 100)
acc.deposit(50)
acc.add_interest()
print(acc)`],
[2, 'Обработка ошибок', 'try, except, else, finally.', 2, 20, 90, 30, 40, `def safe_div(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("cannot divide by zero")
        return None
    except TypeError as e:
        print("bad types:", e)
        return None
    else:
        return result
    finally:
        print("done:", a, b)


print(safe_div(10, 2))
print(safe_div(1, 0))
print(safe_div("x", 3))

values = ["10", "abc", "7"]
parsed = []
for v in values:
    try:
        parsed.append(int(v))
    except ValueError:
        continue
print(parsed)`],
[3, 'Сортировка и поиск', 'Пузырьковая сортировка и бинарный поиск.', 3, 25, 92, 40, 55, `def binary_search(items, target):
    lo, hi = 0, len(items) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


def bubble_sort(arr):
    a = arr[:]
    for i in range(len(a)):
        swapped = False
        for j in range(len(a) - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break
    return a


data = bubble_sort([29, 3, 17, 8, 41, 12])
print(data)
print(binary_search(data, 17), binary_search(data, 5))`],
[3, 'Рекурсия', 'flatten, все подмножества и ханойские башни.', 3, 25, 92, 40, 55, `def flatten(items):
    out = []
    for x in items:
        if isinstance(x, list):
            out.extend(flatten(x))
        else:
            out.append(x)
    return out


def power_set(s):
    if not s:
        return [[]]
    rest = power_set(s[1:])
    return rest + [[s[0]] + r for r in rest]


def hanoi(n, a="A", b="B", c="C", moves=None):
    moves = [] if moves is None else moves
    if n:
        hanoi(n - 1, a, c, b, moves)
        moves.append((a, c))
        hanoi(n - 1, b, a, c, moves)
    return moves


print(flatten([1, [2, [3, 4]], [[5]], 6]))
print(power_set([1, 2, 3]))
print(len(hanoi(5)))`],
[3, 'Генераторы и itertools', 'yield, islice, count и groupby.', 3, 26, 92, 40, 55, `from itertools import islice, count, groupby


def evens():
    for n in count(0, 2):
        yield n


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


print(list(islice(evens(), 6)))
print(list(chunked(list(range(10)), 3)))

total = sum(x * x for x in range(1000) if x % 3 == 0)
print(total)

words = sorted(["apple", "avocado", "banana", "blueberry", "cherry"])
for letter, group in groupby(words, key=lambda w: w[0]):
    print(letter, list(group))`],
[4, 'Декораторы', 'Свои декораторы: таймер и кеш.', 3, 30, 94, 55, 75, `import time
from functools import wraps


def timer(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        ms = (time.perf_counter() - start) * 1000
        print(f"{fn.__name__} took {ms:.2f} ms")
        return result
    return wrapper


def cache(fn):
    memo = {}

    @wraps(fn)
    def inner(n):
        if n not in memo:
            memo[n] = fn(n)
        return memo[n]
    return inner


@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


@timer
def run():
    return [fib(i) for i in range(30)]


print(run()[-5:])`],
[4, 'dataclass и типы', 'dataclass, field, Optional и аннотации.', 3, 30, 94, 55, 75, `from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Task:
    title: str
    done: bool = False
    tags: list[str] = field(default_factory=list)
    due: Optional[str] = None

    def mark(self) -> "Task":
        self.done = True
        return self


@dataclass
class Board:
    tasks: list[Task] = field(default_factory=list)

    def add(self, title: str, *tags: str) -> Task:
        t = Task(title, tags=list(tags))
        self.tasks.append(t)
        return t

    def pending(self) -> list[str]:
        return [t.title for t in self.tasks if not t.done]


b = Board()
b.add("write parser", "code")
b.add("fix login", "bug").mark()
b.add("deploy")
print(b.pending())
print(b.tasks[1])`],
[5, 'LRU-кеш и калькулятор', 'Финальный босс: свой LRU-кеш и рекурсивный парсер выражений.', 3, 35, 95, 80, 120, `from collections import OrderedDict


class LRU:
    def __init__(self, cap):
        self.cap = cap
        self.d = OrderedDict()

    def get(self, k, default=None):
        if k not in self.d:
            return default
        self.d.move_to_end(k)
        return self.d[k]

    def put(self, k, v):
        self.d[k] = v
        self.d.move_to_end(k)
        if len(self.d) > self.cap:
            self.d.popitem(last=False)


def calc(expr):
    tokens = expr.replace("(", " ( ").replace(")", " ) ").split()
    pos = 0

    def atom():
        nonlocal pos
        t = tokens[pos]
        pos += 1
        if t == "(":
            v = add()
            pos += 1
            return v
        return float(t)

    def mul():
        nonlocal pos
        v = atom()
        while pos < len(tokens) and tokens[pos] in "*/":
            op = tokens[pos]
            pos += 1
            v = v * atom() if op == "*" else v / atom()
        return v

    def add():
        nonlocal pos
        v = mul()
        while pos < len(tokens) and tokens[pos] in "+-":
            op = tokens[pos]
            pos += 1
            v = v + mul() if op == "+" else v - mul()
        return v

    return add()


c = LRU(2)
c.put("a", 1)
c.put("b", 2)
c.get("a")
c.put("c", 3)
print(list(c.d))
print(calc("2 * ( 3 + 4 ) - 10 / 5"))`]
]

const IT = [
  ['avatar', 'Питон', '🐍', 0], ['avatar', 'Лис', '🦊', 50], ['avatar', 'Панда', '🐼', 60], ['avatar', 'Робот', '🤖', 80],
  ['avatar', 'Пришелец', '👾', 100], ['avatar', 'Сова', '🦉', 120], ['avatar', 'Дракон', '🐉', 180], ['avatar', 'Единорог', '🦄', 220],
  ['avatar', 'Огонь', '🔥', 300], ['avatar', 'Корона', '👑', 600],
  ['frame', 'Лёд', 'ice', 150], ['frame', 'Неон', 'neon', 250], ['frame', 'Золото', 'gold', 350], ['frame', 'Пламя', 'fire', 450], ['frame', 'Радуга', 'rainbow', 700],
  ['title', 'Питонист', 'Питонист', 80], ['title', 'Скорострел', 'Скорострел', 200], ['title', 'Без единой ошибки', 'Без единой ошибки', 300],
  ['title', 'Клавиатурный ниндзя', 'Клавиатурный ниндзя', 450], ['title', 'Легенда кода', 'Легенда кода', 1000],
  ['theme', 'Матрица', 'matrix', 250], ['theme', 'Закат', 'sunset', 250], ['theme', 'Океан', 'ocean', 250], ['theme', 'Конфета', 'candy', 300],
  ['color', 'Розовый ник', '#ff5fa2', 120], ['color', 'Бирюзовый ник', '#4fd6c8', 120], ['color', 'Жёлтый ник', '#ffd43b', 120],
  ['color', 'Фиолетовый ник', '#a98bff', 150], ['color', 'Градиентный ник', 'grad', 500]
]

export async function seed() {
  const c = await db.one('select count(*)::int n from leagues')
  if (!c.n) {
    const ids = []
    for (const [i, l] of LG.entries()) {
      const r = await db.one('insert into leagues(name,icon,color,ord,reward) values($1,$2,$3,$4,$5) returning id', [l[0], l[1], l[2], i + 1, l[3]])
      ids.push(r.id)
    }
    const t = await db.one('select count(*)::int n from tasks')
    if (!t.n) {
      for (const [i, x] of TS.entries()) {
        await db.q('insert into tasks(league_id,title,descr,lvl,min_wpm,min_acc,coins,xp,code,ord) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [ids[x[0]], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], i + 1])
      }
    }
  }
  const ic = await db.one('select count(*)::int n from items')
  if (!ic.n) {
    for (const [i, x] of IT.entries()) await db.q('insert into items(kind,name,value,price,ord) values($1,$2,$3,$4,$5)', [...x, i])
  }
}
