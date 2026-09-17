#include <algorithm>
#include <iostream>
int main() { int attack, defense; std::cin >> attack >> defense; std::cout << "Damage: " << std::max(1, attack - defense) << "\n"; }
