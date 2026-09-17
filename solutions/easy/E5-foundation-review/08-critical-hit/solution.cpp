#include <iostream>
int main() { int base, chance, roll; std::cin >> base >> chance >> roll; std::cout << "Damage: " << (roll < chance ? base * 2 : base) << "\n"; }
