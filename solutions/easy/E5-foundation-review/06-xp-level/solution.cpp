#include <iostream>
int main() { int xp; std::cin >> xp; std::cout << "Level " << xp / 100 + 1 << ", " << 100 - xp % 100 << " XP to next\n"; }
