#include <iostream>
int main() { int used, maximum; std::cin >> used >> maximum; if (used > maximum) std::cout << "Over capacity\n"; else if (used == maximum) std::cout << "Full\n"; else if (used >= maximum - 2) std::cout << "Almost full\n"; else std::cout << "Space available\n"; }
