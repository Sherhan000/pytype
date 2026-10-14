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

const EX = [
  ['quiz', 'Что выведет: срезы', 'Сортировка списка и срез.', `nums = [3, 1, 4, 1, 5]
nums.sort()
print(nums[1:4])`, { q: 'Что выведет этот код?', options: ['[1, 3, 4]', '[1, 1, 3]', '[3, 4, 5]', '[1, 4, 1]'], answer: 0, explain: 'После sort() список [1, 1, 3, 4, 5]. Срез [1:4] берёт элементы с индексами 1, 2 и 3.' }],
  ['quiz', 'Что выведет: изменяемый аргумент', 'Ловушка со списком в значении по умолчанию.', `def f(x, acc=[]):
    acc.append(x)
    return len(acc)

f(1)
f(2)
print(f(3))`, { q: 'Что выведет этот код?', options: ['1', '3', '0', 'Ошибку'], answer: 1, explain: 'Значение по умолчанию создаётся один раз. Все три вызова добавляют в один и тот же список.' }],
  ['quiz', 'Что выведет: генератор словаря', 'Впиши вывод сам, символ в символ.', `words = ["py", "type", "code"]
print({w: len(w) for w in words if len(w) > 2})`, { q: 'Напиши, что выведет код', answer: "{'type': 4, 'code': 4}", explain: 'Слово "py" короче трёх букв и отсеивается условием if.' }],
  ['fix', 'Исправь: среднее', 'Функция должна вернуть среднее значение списка. Должно получиться 5.0.', `def average(nums):
    total = 0
    for n in nums:
        total = n
    return total / len(nums)


print(average([2, 4, 6, 8]))`, { fixed: `def average(nums):
    total = 0
    for n in nums:
        total += n
    return total / len(nums)


print(average([2, 4, 6, 8]))`, hint: 'Посмотри, что происходит с total на каждом шаге цикла.', explain: 'total = n перезаписывает сумму. Нужно копить: total += n.' }],
  ['fix', 'Исправь: гласные', 'Должно быть 3 гласных в "Python Is Fun".', `def count_vowels(text):
    count = 0
    for ch in text:
        if ch in "aeiou":
            count += 1
    return count


print(count_vowels("Python Is Fun"))`, { fixed: `def count_vowels(text):
    count = 0
    for ch in text.lower():
        if ch in "aeiou":
            count += 1
    return count


print(count_vowels("Python Is Fun"))`, hint: 'Заглавная I тоже гласная.', explain: 'Сравнение учитывает регистр. text.lower() приводит буквы к нижнему регистру.' }],
  ['fill', 'Допиши: квадраты', 'Заполни пропуски, чтобы получить квадраты чисел от 1 до n.', `def squares(n):
    result = []
    for i in {{range}}(1, n + 1):
        result.{{append}}(i {{**}} 2)
    {{return}} result


print(squares(5))`, { hint: 'Нужны: функция для диапазона, метод списка, степень и выход из функции.', explain: 'range(1, n + 1) даёт числа от 1 до n, а i ** 2 возводит в квадрат.' }],
  ['fill', 'Допиши: цепочка вызовов', 'Метод inc должен возвращать сам объект, чтобы вызовы шли цепочкой.', `class Counter:
    def {{__init__}}(self):
        self.value = 0

    def inc(self):
        self.value {{+=}} 1
        return {{self}}


c = Counter()
c.inc().inc().inc()
print(c.value)`, { hint: 'Конструктор, увеличение на 1 и что вернуть для цепочки.', explain: 'Возвращая self, метод позволяет писать c.inc().inc().' }]
]

const EX3 = [
  ['test', 'Тест: основы Python', 'Пять вопросов про типы, операторы и функции.', '', { qs: [
    { q: 'Какой тип у значения 3.0?', options: ['int', 'float', 'str', 'decimal'], answer: 1, explain: 'Число с точкой это float, даже если дробная часть нулевая.' },
    { q: 'Что вернёт этот вызов?', code: 'len([1, [2, 3], 4])', options: ['4', '3', '2', 'Ошибку'], answer: 1, explain: 'Вложенный список считается одним элементом.' },
    { q: 'Какой оператор даёт остаток от деления?', options: ['//', '%', '/', '**'], answer: 1, explain: '7 % 3 даёт 1. А // это деление нацело.' },
    { q: 'Что выведет print(bool(""))?', options: ['True', 'False', 'None', '""'], answer: 1, explain: 'Пустая строка, 0, None и пустые коллекции считаются ложными.' },
    { q: 'Как правильно объявить функцию?', options: ['function f():', 'def f():', 'func f():', 'def f:'], answer: 1, explain: 'Функция объявляется через def, а после имени всегда идут скобки.' }
  ] }],
  ['test', 'Тест: списки и словари', 'Проверь, как работают коллекции.', '', { qs: [
    { q: 'Что выведет код?', code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))', options: ['3', '4', 'Ошибку', '1'], answer: 1, explain: 'b = a не копирует список. Это две ссылки на один и тот же объект.' },
    { q: 'Какой метод удаляет и возвращает последний элемент списка?', options: ['remove()', 'pop()', 'del', 'clear()'], answer: 1, explain: 'pop() без аргумента забирает последний элемент.' },
    { q: 'Что вернёт этот вызов?', code: "{'a': 1}.get('b', 0)", options: ['None', '0', 'Ошибку KeyError', "'b'"], answer: 1, explain: 'get возвращает значение по умолчанию, если ключа нет.' },
    { q: 'Можно ли сделать список ключом словаря?', options: ['Да', 'Нет, список изменяемый', 'Только пустой', 'Только из чисел'], answer: 1, explain: 'Ключ должен быть хешируемым. Вместо списка подойдёт кортеж.' },
    { q: 'Что выведет код?', code: 'print([x * 2 for x in range(3)])', options: ['[0, 2, 4]', '[2, 4, 6]', '[0, 1, 2]', '[1, 2, 3]'], answer: 0, explain: 'range(3) даёт 0, 1, 2, и каждое число умножается на 2.' }
  ] }],
  ['next', 'Что дальше: сумма чисел', 'Выбери строку, которая должна идти следующей.', 'total = 0\nfor n in range(1, 6):', { q: 'Какая строка будет дальше?', options: ['    total += n', 'total += n', '    total = n', '    return total'], answer: 0, explain: 'Тело цикла пишется с отступом, а сумму копим через +=.' }],
  ['next', 'Что дальше: обработка ошибки', 'Как продолжить блок try?', 'text = "42a"\ntry:\n    x = int(text)', { q: 'Какая строка будет дальше?', options: ['except ValueError:', '    except ValueError:', 'catch ValueError:', 'else ValueError:'], answer: 0, explain: 'except стоит на одном уровне с try, без отступа.' }],
  ['next', 'Что дальше: метод класса', 'Допиши тело метода.', 'class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def bark(self):', { q: 'Какая строка будет дальше?', options: ['        return f"{self.name}: woof"', '    return f"{self.name}: woof"', '        return f"{name}: woof"', '        self.bark()'], answer: 0, explain: 'Внутри метода к полям обращаются через self, а тело метода стоит на втором уровне отступа.' }],
  ['trim', 'Убери лишнее: максимум', 'Функция должна вернуть 9.', 'def biggest(nums):\n    best = nums[0]\n    for n in nums:\n        if n > best:\n            best = n\n        best = 0\n    return best\n\n\nprint(biggest([3, 9, 4]))', { extra: [6], hint: 'Одна строка портит результат на каждом шаге цикла.', explain: 'best = 0 обнуляла найденный максимум в каждой итерации.' }],
  ['trim', 'Убери лишнее: буквы o', 'Код должен вывести только количество букв o, то есть 2.', 'count = 0\ntext = "hello world"\nfor ch in text:\n    if ch == "o":\n        count += 1\n        count = count - 1\nprint(count)\nprint(text.upper())', { extra: [6, 8], hint: 'Лишних строк две: одна ломает подсчёт, другая выводит то, что не нужно.', explain: 'count = count - 1 отменяла каждое прибавление, а print(text.upper()) печатал лишнее.' }]
]

const NEWS2 = [
  ['Видеоуроки', 'Новый раздел с уроками: смотри видео прямо на сайте и закрепляй заданием. За каждый новый урок +10 XP.', '🎬'],
  ['Пояснения к строкам', 'Пока печатаешь, над кодом видно, что делает текущая строка. Включается кнопкой 💬 над редактором.', '💬'],
  ['Вход через Google и GitHub', 'Можно входить одной кнопкой. Если аккаунт уже есть, привяжи сервис в настройках профиля.', '🔑'],
  ['Быстрее и чище', 'Редактор стал заметно быстрее на длинном коде, настройки печати собраны в одно окно, а чат защищён от спама.', '⚡']
]

const NEWS3 = [
  ['Головоломки и поиск', 'У головоломок теперь своя страница в меню. Сверху появился поиск: жми Ctrl+K или на лупу и прыгай в любой раздел, задание или урок.', '🔎', '#/puzzles'],
  ['Магазин, чат и турнир шире', 'В магазине можно примерить вещь перед покупкой, в чате видно, кто сейчас в сети, а в турнире и дуэлях стало больше статистики.', '🛍️', '#/shop']
]

const NEWS4 = [
  ['Теперь мы Indentra', 'У сайта новое имя. Indentra от слова indent, отступ: в Python без правильных отступов код не работает. Аккаунты, монеты и прогресс на месте.', '✨', ''],
  ['Группы', 'Собери друзей, класс или команду в свою группу. Внутри общий рейтинг недели, чат и лента успехов. Позвать можно одной ссылкой.', '👥', '#/groups'],
  ['Заморозка огня', 'В магазине появилась заморозка: если пропустишь один день, серия не сгорит. Можно держать две штуки.', '🧊', '#/shop'],
  ['Работа над ошибками', 'В тренировке есть кнопка «Мои ошибки»: собирает строки с символами, на которых ты чаще всего ошибаешься.', '🎯', '#/train']
]

const NLINK = {
  'Дуэли, лента и задания дня': '#/duel', 'Турнир недели и призрак': '#/tourn', 'Своё: файлы, режимы и таймер': '#/train',
  'Новые головоломки': '#/puzzles', 'Аналитика': '#/analytics', 'Видеоуроки': '#/lessons', 'Пояснения к строкам': '#/train',
  'Вход через Google и GitHub': '#/me', 'Быстрее и чище': '#/train'
}

const ISSUES = [
  'Если на сайт давно никто не заходил, первая загрузка идёт около минуты: бесплатный сервер засыпает.',
  'Вход через Google пока не подключён. Обычный вход и вход через GitHub работают.',
  'На iPhone уведомления приходят, только если сайт добавлен на экран «Домой».',
  'Большие видео (больше 60 МБ) загрузить нельзя, такие уроки выкладываем на YouTube.'
]

const NEWS = [
  ['Дуэли, лента и задания дня', 'Соревнуйся с живыми соперниками, ставь реакции на успехи друзей и забирай сундук за три задания дня.', '⚔️'],
  ['Турнир недели и призрак', 'Один код на всех на целую неделю и призы лучшим. На заданиях можно включить призрака: свой рекорд или лучшего игрока.', '🏁'],
  ['Своё: файлы, режимы и таймер', 'В тренировке можно открыть свой файл с кодом и печатать его по кускам. Код можно показывать целиком, по строкам или по словам. Есть печать на время: от 30 секунд до 5 минут.', '📂'],
  ['Новые головоломки', 'Тесты с вопросами, «Что будет дальше» и «Убери лишний код». После ответа видно, что выбрали другие игроки.', '🧩'],
  ['Аналитика', 'Новая страница со статистикой: насколько ты быстрее других, какие задания самые сложные, в какие часы все печатают и на каких символах ошибаются чаще всего.', '📊']
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
  const ex = await db.one("select 1 from kv where k='seed2'")
  if (!ex) {
    for (const [i, x] of EX.entries()) {
      await db.q('insert into tasks(league_id,title,descr,kind,code,meta,lvl,min_wpm,min_acc,coins,xp,ord) values(null,$1,$2,$3,$4,$5,1,0,0,20,30,$6)',
        [x[1], x[2], x[0], x[3], JSON.stringify(x[4]), 100 + i])
    }
    await db.q("insert into kv(k,v) values('seed2','true') on conflict do nothing")
  }
  if (!(await db.one("select 1 from kv where k='seed3'"))) {
    for (const [i, x] of EX3.entries()) {
      await db.q('insert into tasks(league_id,title,descr,kind,code,meta,lvl,min_wpm,min_acc,coins,xp,ord) values(null,$1,$2,$3,$4,$5,1,0,0,25,35,$6)',
        [x[1], x[2], x[0], x[3], JSON.stringify(x[4]), 200 + i])
    }
    await db.q("insert into kv(k,v) values('seed3','true') on conflict do nothing")
  }
  if (!(await db.one('select 1 from news limit 1'))) {
    for (const [i, x] of NEWS.entries()) await db.q("insert into news(title,body,icon,at) values($1,$2,$3,now() - ($4::int * interval '1 minute'))", [...x, NEWS.length - i])
  }
  if (!(await db.one("select 1 from kv where k='news2'"))) {
    for (const x of NEWS2) await db.q('insert into news(title,body,icon) values($1,$2,$3)', x)
    await db.q("insert into kv(k,v) values('news2','true') on conflict do nothing")
  }
  if (!(await db.one("select 1 from kv where k='news3'"))) {
    for (const [k, l] of Object.entries(NLINK)) await db.q("update news set link=$2 where title=$1 and link=''", [k, l])
    for (const x of NEWS3) await db.q('insert into news(title,body,icon,link) values($1,$2,$3,$4)', x)
    if (!(await db.one('select 1 from issues limit 1'))) for (const x of ISSUES.slice().reverse()) await db.q('insert into issues(text) values($1)', [x])
    await db.q("insert into kv(k,v) values('news3','true') on conflict do nothing")
  }
  if (!(await db.one("select 1 from kv where k='news4'"))) {
    for (const x of NEWS4) await db.q('insert into news(title,body,icon,link) values($1,$2,$3,$4)', x)
    await db.q("insert into kv(k,v) values('news4','true') on conflict do nothing")
  }
}
