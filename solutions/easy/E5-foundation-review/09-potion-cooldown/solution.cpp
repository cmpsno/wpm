#include <iostream>
int main() { int current, last, cooldown; std::cin >> current >> last >> cooldown; int elapsed = current - last; if (elapsed >= cooldown) std::cout << "Ready\n"; else std::cout << "Wait " << cooldown - elapsed << " seconds\n"; }
